import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import {
  createCacheKey,
  getOrSetCachedValue,
  pruneExpiredCacheEntries,
  setCachedValue,
} from "@/lib/job-cache";
import {
  dedupeJobsByTitleAndCompany,
  detectSeniority,
  filterJobs,
  getCountry,
  getWorkMode,
  paginateJobs,
  paginateWithCursor,
  parseSalary,
} from "@/lib/jobs-utils";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  country: string;
  workMode: string;
  seniorityLevel: string;
  employmentType: string;
  description: string;
  requirements: string;
  postedAt: string;
  salaryMin?: number;
  salaryMax?: number;
  isSaved: boolean;
  applicationUrl: string;
  source: string;
}

interface RawJob {
  id: string;
  _id?: string;
  slug?: string;
  title: string;
  company_name?: string;
  company?: { display_name: string };
  owner?: { companyName?: string };
  location?: string | { display_name?: string; area?: string[] };
  location_data?: { display_name?: string };
  locationAddress?: string;
  description?: string;
  descriptionBreakdown?: { oneSentenceJobSummary?: string };
  url?: string;
  redirect_url?: string;
  created?: string;
  created_at?: number;
  salary_min?: number;
  salary_max?: number;
  salary?: string;
  contract_time?: string;
  contract_type?: string;
  remote?: boolean;
  candidate_required_location?: string;
  job_type?: string;
  type?: string;
  tags?: string[];
}

type SavedJobRecord = Awaited<
  ReturnType<typeof prisma.savedJob.findMany>
>[number];

type JobSourceName = "adzuna" | "remotive" | "arbeitnow" | "rise" | "jooble" | "remoteok" | "themuse" | "jobicy" | "greenhouse";

type CachedJobsPayload = {
  jobs: Job[];
  sourcesBreakdown: Record<JobSourceName, number>;
  partialFailure: boolean;
  warnings: string[];
};

const REMOTIVE_CATEGORIES = [
  "software-dev",
  "marketing",
  "customer-service",
  "design",
  "sales",
  "product",
  "business",
  "data",
  "devops-sysadmin",
  "finance-legal",
  "hr",
  "quality-assurance",
  "writing",
] as const;

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const JOB_DETAIL_CACHE_TTL_MS = 15 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 6_000;

function extractLocation(raw: RawJob): string {
  if (typeof raw.location === "string") return raw.location;
  if (typeof raw.location === "object" && raw.location?.display_name) {
    return raw.location.display_name;
  }
  if (raw.location_data?.display_name) return raw.location_data.display_name;
  if (raw.candidate_required_location) return raw.candidate_required_location;
  if (raw.locationAddress) return raw.locationAddress;
  return "Not specified";
}

function formatJob(
  raw: RawJob,
  sourceId: string,
  source: JobSourceName,
  savedJobIds: string[],
): Job {
  const companyName =
    raw.company_name ||
    raw.company?.display_name ||
    raw.owner?.companyName ||
    "Unknown Company";

  const location = extractLocation(raw);
  const appUrl = raw.url || raw.redirect_url || "#";
  const postedAt =
    raw.created ||
    (raw.created_at
      ? new Date(raw.created_at * 1000).toISOString()
      : new Date().toISOString());

  const description =
    raw.description?.replace(/<[^>]*>/g, "") ||
    raw.descriptionBreakdown?.oneSentenceJobSummary ||
    "";

  let salaryMin = raw.salary_min;
  let salaryMax = raw.salary_max;

  if (!salaryMin && raw.salary) {
    const parsed = parseSalary(raw.salary);
    salaryMin = parsed.min;
    salaryMax = parsed.max;
  }

  const id = `${source}-${sourceId}`;

  return {
    id,
    title: raw.title,
    companyName,
    location,
    country: getCountry(source, location),
    workMode: raw.remote
      ? "Remote"
      : getWorkMode(raw.remote, raw.job_type || raw.type || raw.contract_time),
    seniorityLevel: detectSeniority(raw.title),
    employmentType:
      raw.job_type ||
      raw.type ||
      raw.contract_time ||
      raw.contract_type ||
      "Full-time",
    description,
    requirements: raw.tags?.join(", ") || "See job posting for details",
    postedAt,
    salaryMin,
    salaryMax,
    isSaved: savedJobIds.includes(id),
    applicationUrl: appUrl,
    source,
  };
}

async function fetchJsonWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error("Provider returned non-JSON response");
    }

    if (!response.ok) {
      throw new Error(`Provider request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Adzuna supported country codes + regions for broader global coverage
const ADZUNA_COUNTRIES = [
  { code: "za", label: "South Africa" },
  { code: "ca", label: "Canada" },
  { code: "gb", label: "United Kingdom" },
  { code: "us", label: "United States" },
  { code: "au", label: "Australia" },
  { code: "in", label: "India" },
  { code: "ng", label: "Nigeria" }, // may 404 — caught per-country
] as const;

async function fetchFromAdzuna(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const results = await Promise.allSettled(
    ADZUNA_COUNTRIES.map(async ({ code }) => {
      const url = `https://api.adzuna.com/v1/api/jobs/${code}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&what=${encodeURIComponent(query)}&results_per_page=15`;
      const data = (await fetchJsonWithTimeout(url)) as { results?: RawJob[] };
      if (!Array.isArray(data.results)) return [];
      return data.results.map((job) => formatJob(job, job.id, "adzuna", savedJobIds));
    }),
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fetchFromRemotive(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    const searchData = (await fetchJsonWithTimeout(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`,
    )) as { jobs?: RawJob[] };

    if (Array.isArray(searchData.jobs)) {
      jobs.push(
        ...searchData.jobs.map((job) =>
          formatJob(job, job.id, "remotive", savedJobIds),
        ),
      );
    }
  } catch (error) {
    console.error("Remotive search error:", error);
  }

  for (const category of REMOTIVE_CATEGORIES.slice(0, 5)) {
    if (jobs.length >= 100) break;

    try {
      const data = (await fetchJsonWithTimeout(
        `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(category)}&limit=50`,
      )) as { jobs?: RawJob[] };

      if (!Array.isArray(data.jobs)) continue;

      const filtered = data.jobs.filter(
        (job) =>
          !query || job.title.toLowerCase().includes(query.toLowerCase()),
      );

      jobs.push(
        ...filtered.map((job) =>
          formatJob(job, job.id, "remotive", savedJobIds),
        ),
      );
    } catch (error) {
      console.error(`Remotive ${category} error:`, error);
    }
  }

  return jobs;
}

async function fetchFromArbeitnow(savedJobIds: string[]): Promise<Job[]> {
  const jobs: Job[] = [];

  for (let page = 1; page <= 3; page += 1) {
    try {
      const data = (await fetchJsonWithTimeout(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      )) as { data?: RawJob[] } | RawJob[];

      const jobList = Array.isArray(data) ? data : data.data;

      if (!Array.isArray(jobList) || jobList.length === 0) {
        break;
      }

      jobs.push(
        ...jobList.map((job) =>
          formatJob(job, job.slug || job.id, "arbeitnow", savedJobIds),
        ),
      );
    } catch (error) {
      console.error("Arbeitnow error:", error);
      break;
    }
  }

  return jobs;
}

async function fetchFromRise(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  try {
    const data = (await fetchJsonWithTimeout(
      `https://api.joinrise.io/api/v1/jobs/public?page=1&limit=50&search=${encodeURIComponent(query)}`,
    )) as {
      success?: boolean;
      result?: { jobs?: RawJob[] };
    };

    if (!data.success || !Array.isArray(data.result?.jobs)) {
      return [];
    }

    return data.result.jobs.map((job) =>
      formatJob(job, job._id || job.id, "rise", savedJobIds),
    );
  } catch (error) {
    console.error("Rise error:", error);
    return [];
  }
}

async function fetchFromJooble(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) return [];

  const jobs: Job[] = [];
  const joobleCountries = [
    // Africa
    { name: "Nigeria", code: "NG" },
    { name: "Ghana", code: "GH" },
    { name: "Kenya", code: "KE" },
    { name: "South Africa", code: "ZA" },
    // North America
    { name: "Canada", code: "CA" },
    { name: "United States", code: "US" },
    // Europe / Oceania
    { name: "United Kingdom", code: "GB" },
    { name: "Australia", code: "AU" },
    // Asia
    { name: "India", code: "IN" },
  ] as const;

  for (const country of joobleCountries) {
    try {
      const data = (await fetchJsonWithTimeout(
        `https://jooble.org/api/${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: query,
            location: country.name,
            radius: 50,
            page: 1,
          }),
        },
      )) as {
        jobs?: Array<{
          id: string;
          title?: string;
          company?: string;
          location?: string;
          type?: string;
          snippet?: string;
          updated?: string;
          link?: string;
        }>;
      };

      if (!Array.isArray(data.jobs)) continue;

      for (const job of data.jobs.slice(0, 20)) {
        jobs.push({
          id: `jooble-${job.id}`,
          title: job.title || "Unknown Position",
          companyName: job.company || "Unknown Company",
          location: job.location || country.name,
          country: country.code,
          workMode: job.type?.toLowerCase().includes("remote")
            ? "Remote"
            : "Not specified",
          seniorityLevel: detectSeniority(job.title || ""),
          employmentType: job.type || "Full-time",
          description:
            job.snippet?.replace(/<[^>]*>/g, "").substring(0, 2000) || "",
          requirements: "See job posting for details",
          postedAt: job.updated
            ? new Date(job.updated).toISOString()
            : new Date().toISOString(),
          salaryMin: undefined,
          salaryMax: undefined,
          isSaved: savedJobIds.includes(`jooble-${job.id}`),
          applicationUrl: job.link || "#",
          source: "jooble",
        });
      }
    } catch (error) {
      console.error(`Jooble ${country.name} error:`, error);
    }
  }

  return jobs;
}

// Remote OK — completely free, no API key, global remote jobs
// https://remoteok.com/api
async function fetchFromRemoteOK(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  try {
    const tag = query.trim().split(/\s+/)[0].toLowerCase();
    const url = tag
      ? `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`
      : "https://remoteok.com/api";

    const data = (await fetchJsonWithTimeout(url, {
      headers: { "User-Agent": "CareerOS/1.0 (careeros.live)" },
    })) as unknown[];

    if (!Array.isArray(data)) return [];

    // First element is a legal notice object — always skip it
    const rawJobs = data.slice(1).filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && "id" in item,
    );

    return rawJobs.slice(0, 40).map((job) => {
      const id = `remoteok-${job.id}`;
      const title = String(job.position ?? job.title ?? "Position");
      return {
        id,
        title,
        companyName: String(job.company ?? "Unknown Company"),
        location: String(job.location ?? "Worldwide"),
        country: "GLOBAL",
        workMode: "Remote",
        seniorityLevel: detectSeniority(title),
        employmentType: "Full-time",
        description: String(job.description ?? "")
          .replace(/<[^>]*>/g, "")
          .substring(0, 1000),
        requirements: Array.isArray(job.tags)
          ? (job.tags as string[]).join(", ")
          : "See job posting for details",
        postedAt: job.date
          ? String(job.date)
          : new Date().toISOString(),
        salaryMin: typeof job.salary_min === "number" ? job.salary_min : undefined,
        salaryMax: typeof job.salary_max === "number" ? job.salary_max : undefined,
        isSaved: savedJobIds.includes(id),
        applicationUrl: String(
          job.url ?? `https://remoteok.com/jobs/${job.id}`,
        ),
        source: "remoteok" as JobSourceName,
      };
    });
  } catch (error) {
    console.error("RemoteOK error:", error);
    return [];
  }
}

// Jobicy — free, no key, global remote-only jobs with geo data
// https://jobi.cy/apidocs
async function fetchFromJobicy(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  try {
    const tag = query.trim().split(/\s+/)[0].toLowerCase();
    const url = tag
      ? `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`
      : "https://jobicy.com/api/v2/remote-jobs?count=50";
    const data = (await fetchJsonWithTimeout(url)) as {
      jobs?: Array<{
        id: number;
        url: string;
        jobTitle: string;
        companyName: string;
        jobGeo: string;
        jobLevel?: string;
        jobType?: string;
        pubDate: string;
        annualSalaryMin?: number;
        annualSalaryMax?: number;
        jobExcerpt?: string;
        jobDescription?: string;
      }>;
    };

    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map((job): Job => {
      const id = `jobicy-${job.id}`;
      const geoRaw = job.jobGeo?.trim() || "Worldwide";
      const location = geoRaw.split(",")[0].trim() || "Worldwide";
      return {
        id,
        title: job.jobTitle,
        companyName: job.companyName,
        location,
        country: "GLOBAL",
        workMode: "Remote",
        seniorityLevel: detectSeniority(job.jobTitle),
        employmentType: job.jobType || "Full-time",
        description: (job.jobExcerpt || job.jobDescription || "")
          .replace(/<[^>]*>/g, "")
          .substring(0, 1000),
        requirements: "See job posting for details",
        postedAt: job.pubDate || new Date().toISOString(),
        salaryMin: job.annualSalaryMin,
        salaryMax: job.annualSalaryMax,
        isSaved: savedJobIds.includes(id),
        applicationUrl: job.url,
        source: "jobicy",
      };
    });
  } catch (error) {
    console.error("Jobicy error:", error);
    return [];
  }
}

// Greenhouse public job boards — Africa-focused companies with verified active listings
// No API key required
interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  updated_at: string;
  absolute_url: string;
  departments: Array<{ name: string }>;
  company_name?: string;
  content?: string;
}

const GREENHOUSE_BOARDS = [
  { slug: "paystack",    company: "Paystack" },
  { slug: "moniepoint", company: "Moniepoint" },
  { slug: "jumia",      company: "Jumia" },
] as const;

async function fetchFromGreenhouse(savedJobIds: string[]): Promise<Job[]> {
  const results = await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async ({ slug, company }) => {
      const data = (await fetchJsonWithTimeout(
        `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
        {},
        8_000,
      )) as { jobs?: GreenhouseJob[] };

      if (!Array.isArray(data.jobs)) return [];

      return data.jobs.map((job): Job => {
        const id = `greenhouse-${job.id}`;
        const location = job.location?.name || "Not specified";
        return {
          id,
          title: job.title,
          companyName: job.company_name || company,
          location,
          country: getCountry("greenhouse", location),
          workMode: location.toLowerCase().includes("remote") ? "Remote" : "On-site",
          seniorityLevel: detectSeniority(job.title),
          employmentType: "Full-time",
          description: (job.content || "").replace(/<[^>]*>/g, "").substring(0, 1000),
          requirements: job.departments?.[0]?.name || "See job posting for details",
          postedAt: job.updated_at || new Date().toISOString(),
          isSaved: savedJobIds.includes(id),
          applicationUrl: job.absolute_url,
          source: "greenhouse",
        };
      });
    }),
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// The Muse — free public API, US-focused professional roles
// https://www.themuse.com/developers/api/v2
async function fetchFromTheMuse(
  query: string,
  savedJobIds: string[],
): Promise<Job[]> {
  try {
    const url = `https://www.themuse.com/api/public/jobs?page=0&descending=true`;
    const data = (await fetchJsonWithTimeout(url)) as {
      results?: Array<{
        id: number;
        name: string;
        company: { name: string };
        locations: Array<{ name: string }>;
        levels: Array<{ name: string }>;
        refs: { landing_page: string };
        publication_date: string;
        contents?: string;
        categories: Array<{ name: string }>;
      }>;
    };

    if (!Array.isArray(data.results)) return [];

    const queryLower = query.toLowerCase();
    const filtered = queryLower
      ? data.results.filter(
          (j) =>
            j.name.toLowerCase().includes(queryLower) ||
            j.categories?.some((c) => c.name.toLowerCase().includes(queryLower)),
        )
      : data.results;

    return filtered.slice(0, 30).map((job) => {
      const id = `themuse-${job.id}`;
      const location = job.locations?.[0]?.name ?? "United States";
      return {
        id,
        title: job.name,
        companyName: job.company?.name ?? "Unknown Company",
        location,
        country: "US",
        workMode: location.toLowerCase().includes("remote") ? "Remote" : "On-site",
        seniorityLevel: job.levels?.[0]?.name ?? detectSeniority(job.name),
        employmentType: "Full-time",
        description: (job.contents ?? "").replace(/<[^>]*>/g, "").substring(0, 1000),
        requirements: job.categories?.map((c) => c.name).join(", ") ?? "See job posting",
        postedAt: job.publication_date ?? new Date().toISOString(),
        isSaved: savedJobIds.includes(id),
        applicationUrl: job.refs?.landing_page ?? "https://www.themuse.com/jobs",
        source: "themuse" as JobSourceName,
      };
    });
  } catch (error) {
    console.error("TheMuse error:", error);
    return [];
  }
}

function buildSavedJobMap(
  savedJobs: SavedJobRecord[],
): Record<string, SavedJobRecord> {
  return Object.fromEntries(savedJobs.map((job) => [job.externalJobId, job]));
}

function getSingleJobResponse(savedJob: SavedJobRecord) {
  return {
    job: {
      id: savedJob.externalJobId,
      title: savedJob.title,
      companyName: savedJob.companyName || "Unknown Company",
      location: savedJob.location || "Not specified",
      country: savedJob.country || "Unknown",
      workMode: savedJob.workMode || "Not specified",
      seniorityLevel: "Not specified",
      employmentType: "Full-time",
      description:
        "Job details are limited for saved jobs. Please visit the original posting for the full job description.",
      requirements: "See original job posting for requirements.",
      postedAt: savedJob.savedAt.toISOString(),
      isSaved: true,
      applicationUrl: savedJob.applicationUrl || "#",
      source: "saved",
    },
  };
}

async function fetchSearchResults(
  query: string,
  savedJobIds: string[],
): Promise<CachedJobsPayload> {
  const providers: Array<{
    source: JobSourceName;
    run: () => Promise<Job[]>;
  }> = [
    { source: "adzuna",     run: () => fetchFromAdzuna(query, savedJobIds) },
    { source: "remotive",   run: () => fetchFromRemotive(query, savedJobIds) },
    { source: "arbeitnow",  run: () => fetchFromArbeitnow(savedJobIds) },
    { source: "rise",       run: () => fetchFromRise(query, savedJobIds) },
    { source: "jooble",     run: () => fetchFromJooble(query, savedJobIds) },
    { source: "remoteok",   run: () => fetchFromRemoteOK(query, savedJobIds) },
    { source: "themuse",    run: () => fetchFromTheMuse(query, savedJobIds) },
    { source: "jobicy",     run: () => fetchFromJobicy(query, savedJobIds) },
    { source: "greenhouse", run: () => fetchFromGreenhouse(savedJobIds) },
  ];

  const results = await Promise.allSettled(
    providers.map(async (provider) => ({
      source: provider.source,
      jobs: await provider.run(),
    })),
  );

  const allJobs: Job[] = [];
  const sourcesBreakdown: Record<JobSourceName, number> = {
    adzuna: 0,
    remotive: 0,
    arbeitnow: 0,
    rise: 0,
    jooble: 0,
    remoteok: 0,
    themuse: 0,
    jobicy: 0,
    greenhouse: 0,
  };
  const warnings: string[] = [];
  let partialFailure = false;

  for (const result of results) {
    if (result.status === "fulfilled") {
      sourcesBreakdown[result.value.source] = result.value.jobs.length;
      allJobs.push(...result.value.jobs);
    } else {
      partialFailure = true;
      warnings.push("One or more job sources were temporarily unavailable.");
    }
  }

  return {
    jobs: allJobs,
    sourcesBreakdown,
    partialFailure,
    warnings: Array.from(new Set(warnings)),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const rateLimitResult = await checkRateLimit("jobs", RATE_LIMITS.jobs, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      );
    }

    pruneExpiredCacheEntries();

    const userId = await getDbUserId();
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const workMode = searchParams.get("workMode") || "";
    const seniority = searchParams.get("seniority") || "";
    const cursor = searchParams.get("cursor") || undefined;
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10);
    const useCursor = searchParams.get("useCursor") === "true";

    let savedJobs: SavedJobRecord[] = [];
    let savedJobIds: string[] = [];
    let savedJobsMap: Record<string, SavedJobRecord> = {};

    if (userId) {
      savedJobs = await prisma.savedJob.findMany({
        where: { userId },
      });
      savedJobIds = savedJobs.map((job) => job.externalJobId);
      savedJobsMap = buildSavedJobMap(savedJobs);
    }

    if (jobId) {
      const cacheKey = createCacheKey("jobs:detail", { jobId, userId });
      const cachedSingleJob = getOrSetCachedValue(
        cacheKey,
        JOB_DETAIL_CACHE_TTL_MS,
        async () => {
          const savedJob = savedJobsMap[jobId];

          if (savedJob) {
            return getSingleJobResponse(savedJob);
          }

          return null;
        },
      );

      const singleJobResult = await cachedSingleJob;

      if (singleJobResult) {
        return NextResponse.json(singleJobResult);
      }

      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const query = search || "software developer";
    const searchCacheKey = createCacheKey("jobs:search", {
      query,
      userId,
    });

    const cachedPayload = await getOrSetCachedValue<CachedJobsPayload>(
      searchCacheKey,
      SEARCH_CACHE_TTL_MS,
      async () => fetchSearchResults(query, savedJobIds),
    );

    const jobsWithSaveState = cachedPayload.jobs.map((job) => ({
      ...job,
      isSaved: savedJobIds.includes(job.id),
    }));

    for (const job of jobsWithSaveState) {
      setCachedValue(
        createCacheKey("jobs:detail", { jobId: job.id, userId }),
        { job },
        JOB_DETAIL_CACHE_TTL_MS,
      );
    }

    const filteredJobs = filterJobs(jobsWithSaveState, {
      workMode,
      seniority,
      location,
      search,
    });

    const uniqueJobs = dedupeJobsByTitleAndCompany(filteredJobs);

    let pagination;
    let jobs;

    if (useCursor) {
      const cursorResult = paginateWithCursor(uniqueJobs, { cursor, pageSize }, (job) => job.id);
      jobs = cursorResult.items;
      pagination = cursorResult.pagination;
    } else {
      const offsetResult = paginateJobs(uniqueJobs, page, pageSize);
      jobs = offsetResult.items;
      pagination = {
        ...offsetResult.pagination,
        cursor: null,
        hasMore: page < offsetResult.pagination.totalPages,
      };
    }

    return NextResponse.json({
      jobs,
      pagination,
      sources: cachedPayload.sourcesBreakdown,
      filters: { search, location, workMode, seniority },
      partialFailure: cachedPayload.partialFailure,
      warnings: cachedPayload.warnings,
      cached: true,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}
