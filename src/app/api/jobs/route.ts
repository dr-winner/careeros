import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { scrapeJobsForAPI } from "@/lib/scraper";

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
  location?: string;
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
  "writing"
];

function detectSeniority(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("junior") || lower.includes("entry") || lower.includes("graduate") || lower.includes("intern")) {
    return "Entry-Level";
  }
  if (lower.includes("senior") || lower.includes("lead") || lower.includes("principal") || lower.includes("head of")) {
    return "Senior";
  }
  if (lower.includes("manager") || lower.includes("director") || lower.includes("vp") || lower.includes("chief")) {
    return "Senior";
  }
  return "Mid-Level";
}

function getWorkMode(remote?: boolean, jobType?: string): string {
  if (remote || jobType === "remote") return "Remote";
  if (jobType?.includes("contract")) return "Contract";
  if (jobType?.includes("part")) return "Part-time";
  return "Full-time";
}

function parseSalary(salary?: string): { min?: number; max?: number } {
  if (!salary) return {};
  
  const numbers = salary.match(/\d+/g);
  if (!numbers || numbers.length === 0) return {};
  
  const nums = numbers.map(n => parseInt(n) * (salary.includes("k") ? 1000 : 1));
  
  if (nums.length >= 2) {
    return { min: Math.min(...nums), max: Math.max(...nums) };
  }
  return { min: nums[0] };
}

function formatJob(raw: RawJob, sourceId: string, source: string, savedJobIds: string[]): Job {
  const companyName = raw.company_name || raw.company?.display_name || raw.owner?.companyName || "Unknown Company";
  const location = raw.location || raw.location_data?.display_name || raw.candidate_required_location || raw.locationAddress || "Not specified";
  const appUrl = raw.url || raw.redirect_url || "#";
  const postedAt = raw.created || (raw.created_at ? new Date(raw.created_at * 1000).toISOString() : new Date().toISOString());
  const description = raw.description?.replace(/<[^>]*>/g, "").substring(0, 500) || raw.descriptionBreakdown?.oneSentenceJobSummary || "";
  
  let salaryMin = raw.salary_min;
  let salaryMax = raw.salary_max;
  
  if (!salaryMin && raw.salary) {
    const parsed = parseSalary(raw.salary);
    salaryMin = parsed.min;
    salaryMax = parsed.max;
  }
  
  return {
    id: `${source}-${sourceId}`,
    title: raw.title,
    companyName,
    location,
    country: getCountry(source, location),
    workMode: raw.remote ? "Remote" : getWorkMode(raw.remote, raw.job_type || raw.type || raw.contract_time),
    seniorityLevel: detectSeniority(raw.title),
    employmentType: raw.job_type || raw.type || raw.contract_time || raw.contract_type || "Full-time",
    description,
    requirements: raw.tags?.join(", ") || "See job posting for details",
    postedAt,
    salaryMin,
    salaryMax,
    isSaved: savedJobIds.includes(`${source}-${sourceId}`),
    applicationUrl: appUrl,
    source,
  };
}

function getCountry(source: string, location: unknown): string {
  const loc = String(location || "").toLowerCase();
  if (loc.includes("africa") || loc.includes("nigeria") || loc.includes("ghana") || loc.includes("kenya") || loc.includes("south africa")) {
    return "AFRICA";
  }
  if (loc.includes("europe") || loc.includes("germany") || loc.includes("uk") || loc.includes("france")) {
    return "EU";
  }
  if (loc.includes("usa") || loc.includes("united states") || loc.includes("america")) {
    return "USA";
  }
  if (loc.includes("asia") || loc.includes("india") || loc.includes("china")) {
    return "ASIA";
  }
  if (source === "remotive") return "GLOBAL";
  if (source === "arbeitnow") return "EU";
  return "ZA";
}

function filterJobs(jobs: Job[], filters: {
  workMode?: string;
  seniority?: string;
  location?: string;
  search?: string;
}): Job[] {
  return jobs.filter(job => {
    if (filters.workMode && filters.workMode !== "") {
      if (filters.workMode === "Remote" && !job.workMode.includes("Remote")) return false;
      if (filters.workMode === "Full-time" && job.workMode === "Part-time") return false;
      if (filters.workMode !== "Remote" && filters.workMode !== "Full-time" && job.workMode !== filters.workMode && job.workMode !== "Not specified") return false;
    }
    
    if (filters.seniority && filters.seniority !== "" && job.seniorityLevel !== filters.seniority) {
      return false;
    }
    
    if (filters.location && filters.location !== "") {
      const loc = filters.location.toLowerCase();
      if (!job.location.toLowerCase().includes(loc) && !job.country.toLowerCase().includes(loc)) {
        return false;
      }
    }
    
    if (filters.search && filters.search !== "") {
      const search = filters.search.toLowerCase();
      if (!job.title.toLowerCase().includes(search) && !job.companyName.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    return true;
  });
}

async function fetchFromAdzuna(query: string, savedJobIds: string[]): Promise<Job[]> {
  const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
  const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
  
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  
  const jobs: Job[] = [];
  
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=South+Africa&results_per_page=20`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      jobs.push(...data.results.map((j: RawJob) => formatJob(j, j.id, "adzuna", savedJobIds)));
    }
  } catch (error) {
    console.error("Adzuna error:", error);
  }
  
  return jobs;
}

async function fetchFromRemotive(query: string, savedJobIds: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  const searchTerm = encodeURIComponent(query);
  
  try {
    const response = await fetch(`https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=50`);
    const data = await response.json();
    
    if (data.jobs && Array.isArray(data.jobs)) {
      jobs.push(...data.jobs.map((j: RawJob) => formatJob(j, j.id, "remotive", savedJobIds)));
    }
  } catch (error) {
    console.error("Remotive error:", error);
  }
  
  for (const category of REMOTIVE_CATEGORIES.slice(0, 5)) {
    if (jobs.length >= 100) break;
    
    try {
      const response = await fetch(`https://remotive.com/api/remote-jobs?category=${category}&limit=50`);
      const data = await response.json();
      
      if (data.jobs && Array.isArray(data.jobs)) {
        const filtered = data.jobs.filter((j: RawJob) => 
          j.title.toLowerCase().includes(query.toLowerCase()) ||
          !query
        );
        jobs.push(...filtered.map((j: RawJob) => formatJob(j, j.id, "remotive", savedJobIds)));
      }
    } catch {}
  }
  
  return jobs;
}

async function fetchFromArbeitnow(savedJobIds: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  
  for (let page = 1; page <= 3; page++) {
    try {
      const response = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      const data = await response.json();
      
      const jobList = data.data || data;
      
      if (Array.isArray(jobList)) {
        jobs.push(...jobList.map((j: RawJob) => formatJob(j, j.slug || j.id, "arbeitnow", savedJobIds)));
      } else if (!data.data) {
        break;
      }
    } catch (error) {
      console.error("Arbeitnow error:", error);
      break;
    }
  }
  
  return jobs;
}

async function fetchFromRise(query: string, savedJobIds: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  
  try {
    const response = await fetch(`https://api.joinrise.io/api/v1/jobs/public?page=1&limit=50&search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.success && data.result?.jobs) {
      jobs.push(...data.result.jobs.map((j: RawJob) => formatJob(j, j._id || j.id, "rise", savedJobIds)));
    }
  } catch (error) {
    console.error("Rise error:", error);
  }
  
  return jobs;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const workMode = searchParams.get("workMode") || "";
    const seniority = searchParams.get("seniority") || "";
    const page = parseInt(searchParams.get("page") || "1");

    let savedJobIds: string[] = [];
    if (userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        select: { externalJobId: true },
      });
      savedJobIds = savedJobs.map((sj) => sj.externalJobId);
    }

    if (jobId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const query = search || "software developer";
    const allJobs: Job[] = [];

    const promises = [
      fetchFromAdzuna(query, savedJobIds),
      fetchFromRemotive(query, savedJobIds),
      fetchFromArbeitnow(savedJobIds),
      fetchFromRise(query, savedJobIds),
      scrapeJobsForAPI(query).then(jobs => jobs.map(j => ({ ...j, isSaved: savedJobIds.includes(j.id) }))),
    ];

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === "fulfilled") {
        allJobs.push(...result.value);
      }
    }

    const filteredJobs = filterJobs(allJobs, { workMode, seniority, location, search });
    
    const seen = new Set<string>();
    const uniqueJobs = filteredJobs.filter(job => {
      const key = `${job.title}-${job.companyName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const totalResults = uniqueJobs.length;
    const resultsPerPage = 20;
    const startIndex = (page - 1) * resultsPerPage;
    const paginatedJobs = uniqueJobs.slice(startIndex, startIndex + resultsPerPage);

    const sourcesBreakdown = {
      adzuna: allJobs.filter(j => j.source === "adzuna").length,
      remotive: allJobs.filter(j => j.source === "remotive").length,
      arbeitnow: allJobs.filter(j => j.source === "arbeitnow").length,
      rise: allJobs.filter(j => j.source === "rise").length,
      scraped: allJobs.filter(j => j.source.startsWith("scraped-")).length,
    };

    return NextResponse.json({
      jobs: paginatedJobs,
      pagination: {
        page,
        limit: resultsPerPage,
        total: totalResults,
        totalPages: Math.ceil(totalResults / resultsPerPage),
      },
      sources: sourcesBreakdown,
      filters: { search, location, workMode, seniority },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
