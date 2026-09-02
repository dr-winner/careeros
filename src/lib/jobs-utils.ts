import { SKILL_KEYWORDS, canonicalizeSkill, skillMentioned } from "./skills";

export interface JobFilters {
  workMode?: string;
  seniority?: string;
  location?: string;
  search?: string;
  country?: string;
  employmentType?: string;
  datePosted?: string; // "today" | "week" | "month"
}

export interface FilterableJob {
  title: string;
  companyName: string;
  location: string;
  country: string;
  workMode: string;
  seniorityLevel: string;
  employmentType?: string;
  postedAt?: string;
  description?: string;
  requirements?: string;
}

export function detectSeniority(title: string): string {
  const lower = title.toLowerCase();

  if (
    lower.includes("junior") ||
    lower.includes("entry") ||
    lower.includes("graduate") ||
    lower.includes("intern")
  ) {
    return "Entry-Level";
  }

  if (
    lower.includes("senior") ||
    lower.includes("lead") ||
    lower.includes("principal") ||
    lower.includes("head of")
  ) {
    return "Senior";
  }

  if (
    lower.includes("manager") ||
    lower.includes("director") ||
    lower.includes("vp") ||
    lower.includes("chief")
  ) {
    return "Senior";
  }

  return "Mid-Level";
}

export function getWorkMode(remote?: boolean, jobType?: string): string {
  const normalizedJobType = jobType?.toLowerCase();

  if (remote || normalizedJobType === "remote") return "Remote";
  if (normalizedJobType?.includes("contract")) return "Contract";
  if (normalizedJobType?.includes("part")) return "Part-time";
  if (normalizedJobType?.includes("hybrid")) return "Hybrid";
  if (normalizedJobType?.includes("on-site") || normalizedJobType?.includes("onsite")) {
    return "On-site";
  }

  return "Full-time";
}

export function parseSalary(salary?: string): { min?: number; max?: number } {
  if (!salary) return {};

  const normalized = salary.toLowerCase();
  const numbers = normalized.match(/\d+(?:[.,]\d+)?/g);

  if (!numbers || numbers.length === 0) return {};

  const multiplier =
    normalized.includes("k") ? 1_000 : normalized.includes("m") ? 1_000_000 : 1;

  const parsedNumbers = numbers
    .map((value) => Number.parseFloat(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.round(value * multiplier));

  if (parsedNumbers.length === 0) return {};

  if (parsedNumbers.length >= 2) {
    return {
      min: Math.min(...parsedNumbers),
      max: Math.max(...parsedNumbers),
    };
  }

  return { min: parsedNumbers[0] };
}

export function getCountry(source: string, location: unknown): string {
  // Normalize accented characters so "montréal" matches "montreal", etc.
  const loc = String(location || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Africa — Ghana
  if (loc.includes("ghana") || loc.includes("accra") || loc.includes("kumasi") ||
      loc.includes("tema") || loc.includes("takoradi") || loc.includes("cape coast") ||
      loc.includes("tamale") || loc.includes("ho,") || loc.includes("sunyani")) return "GH";

  // Africa — Nigeria
  if (loc.includes("nigeria") || loc.includes("lagos") || loc.includes("abuja") ||
      loc.includes("port harcourt") || loc.includes("ibadan") || loc.includes("kano") ||
      loc.includes("enugu") || loc.includes("benin city") || loc.includes("aba,") ||
      loc.includes("onitsha") || loc.includes("kaduna") || loc.includes("uyo")) return "NG";

  // Africa — Kenya
  if (loc.includes("kenya") || loc.includes("nairobi")) return "KE";

  // Africa — South Africa (explicit mentions only — no longer the catch-all)
  if (loc.includes("south africa") || loc.includes("johannesburg") || loc.includes("cape town") ||
      loc.includes("durban") || loc.includes("pretoria") || loc.includes("soweto")) return "ZA";

  // Africa — West Africa generic (region, not a specific country)
  if (loc.includes("west africa")) return "AF";

  // Africa — other/generic (not ZA)
  if (loc.includes("africa")) return "AF";

  // North America
  if (loc.includes("canada") || loc.includes("toronto") || loc.includes("vancouver") || loc.includes("montreal") || loc.includes("ottawa") || loc.includes("calgary")) return "CA";
  if (loc.includes("united states") || loc.includes("usa") || loc.includes("new york") || loc.includes("san francisco") || loc.includes("austin") || loc.includes("seattle") || loc.includes(", tx") || loc.includes(", ca") || loc.includes(", ny")) return "US";

  // Europe
  if (loc.includes("united kingdom") || loc.includes("london") || loc.includes("manchester") || loc.includes("birmingham") || loc.includes(", uk")) return "GB";
  if (loc.includes("germany") || loc.includes("berlin") || loc.includes("munich")) return "DE";
  if (loc.includes("france") || loc.includes("paris")) return "FR";
  if (loc.includes("europe") || loc.includes("netherlands") || loc.includes("amsterdam")) return "EU";

  // Asia-Pacific
  if (loc.includes("australia") || loc.includes("sydney") || loc.includes("melbourne")) return "AU";
  if (loc.includes("india") || loc.includes("bangalore") || loc.includes("mumbai") || loc.includes("delhi")) return "IN";
  if (loc.includes("singapore")) return "SG";

  // Source-based fallbacks
  if (source === "remotive" || source === "remoteok" || source === "jobicy") return "GLOBAL";
  if (source === "arbeitnow") return "EU";
  if (source === "themuse") return "US";

  // Default: GLOBAL, not ZA (was incorrectly South Africa before)
  return "GLOBAL";
}

const SEARCH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "in", "to", "at", "on",
]);

// Local boards in GH/NG/KE are heavy on admin/sales. A "Ghana" filter that
// only keeps country===GH therefore hides every programming role a Ghana-based
// person can actually do (remote / worldwide). Same for the other African
// markets we treat as home.
const AFRICAN_MARKET_CODES = new Set(["GH", "NG", "KE", "ZA", "AF"]);

const COUNTRY_LOCATION_HINTS: Record<string, string[]> = {
  GH: ["ghana", "accra", "kumasi", "tema", "takoradi"],
  NG: ["nigeria", "lagos", "abuja"],
  KE: ["kenya", "nairobi"],
  ZA: ["south africa", "johannesburg", "cape town", "durban", "pretoria"],
  GB: ["united kingdom", "london", "manchester", ", uk"],
  US: ["united states", "new york", "san francisco"],
};

// Titles that share a token with a real search ("security") but are not
// professional roles the searcher meant.
const NOISE_ROLE_TITLE = /\b(guard|watchman|driver|cleaner|cook|waiter|cashier|hawker|nanny|househelp)\b/i;

export function tokenizeSearch(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t));
}

function jobHaystack(job: FilterableJob): string {
  return [
    job.title,
    job.companyName,
    job.location,
    job.description || "",
    job.requirements || "",
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Phrase match first; otherwise any token in the title/company (so
 * "Cloud Security" hits "Cloud Engineer" and "IT Security Officer").
 * Description-only hits require every token, to avoid "we use the cloud"
 * matching a security search.
 */
export function jobMatchesSearch(job: FilterableJob, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const title = job.title.toLowerCase();
  const company = job.companyName.toLowerCase();
  const hay = jobHaystack(job);

  if (title.includes(query) || company.includes(query) || hay.includes(query)) {
    return !NOISE_ROLE_TITLE.test(job.title);
  }

  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return false;

  if (tokens.some((t) => title.includes(t) || company.includes(t))) {
    return !NOISE_ROLE_TITLE.test(job.title);
  }

  return tokens.every((t) => hay.includes(t));
}

export function jobMatchesCountry(job: FilterableJob, country: string): boolean {
  if (!country) return true;

  if (country === "REMOTE") {
    return job.workMode.toLowerCase().includes("remote") || job.country === "GLOBAL";
  }

  if (job.country === country) return true;

  const loc = job.location.toLowerCase();
  const hints = COUNTRY_LOCATION_HINTS[country];
  if (hints?.some((h) => loc.includes(h))) return true;

  if (AFRICAN_MARKET_CODES.has(country)) {
    if (job.country === "GLOBAL" || job.country === "AF") return true;
    if (job.workMode.toLowerCase().includes("remote")) return true;
  }

  return false;
}

/**
 * When the user already filtered to Ghana (or another African market),
 * GH-first ranking fills page 1 with local admin/sales listings and the
 * remote engineering roles never appear. Interleave 1 local : 2 others.
 */
export function interleaveHomeAndRemote<T extends FilterableJob>(
  jobs: T[],
  homeCountry: string,
): T[] {
  const home: T[] = [];
  const rest: T[] = [];
  const hints = COUNTRY_LOCATION_HINTS[homeCountry] || [];

  for (const job of jobs) {
    const loc = job.location.toLowerCase();
    const isHome = job.country === homeCountry || hints.some((h) => loc.includes(h));
    if (isHome) home.push(job);
    else rest.push(job);
  }

  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < home.length || j < rest.length) {
    if (i < home.length) out.push(home[i++]);
    if (j < rest.length) out.push(rest[j++]);
    if (j < rest.length) out.push(rest[j++]);
  }
  return out;
}

/** Boost jobs whose title overlaps the user's target role. Used to rank, not filter. */
export function roleRelevanceBoost(jobTitle: string, desiredRole: string): number {
  const role = desiredRole.trim().toLowerCase();
  if (!role) return 0;
  const title = jobTitle.toLowerCase();
  if (title.includes(role)) return 40;
  const tokens = tokenizeSearch(role);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => title.includes(t)).length;
  if (hits === 0) return 0;
  if (hits === tokens.length) return 30;
  return 15;
}

export function filterJobs<T extends FilterableJob>(
  jobs: T[],
  filters: JobFilters,
): T[] {
  const nowMs = Date.now();

  return jobs.filter((job) => {
    if (filters.workMode && filters.workMode !== "") {
      if (filters.workMode === "Remote" && !job.workMode.includes("Remote")) {
        return false;
      }

      if (filters.workMode === "Full-time" && job.workMode === "Part-time") {
        return false;
      }

      if (
        filters.workMode !== "Remote" &&
        filters.workMode !== "Full-time" &&
        job.workMode !== filters.workMode &&
        job.workMode !== "Not specified"
      ) {
        return false;
      }
    }

    if (
      filters.seniority &&
      filters.seniority !== "" &&
      job.seniorityLevel !== filters.seniority
    ) {
      return false;
    }

    if (filters.location && filters.location !== "") {
      const loc = filters.location.toLowerCase();

      if (
        !job.location.toLowerCase().includes(loc) &&
        !job.country.toLowerCase().includes(loc)
      ) {
        return false;
      }
    }

    if (filters.search && filters.search !== "" && !jobMatchesSearch(job, filters.search)) {
      return false;
    }

    if (filters.country && filters.country !== "" && !jobMatchesCountry(job, filters.country)) {
      return false;
    }

    if (filters.employmentType && filters.employmentType !== "") {
      const jobType = (job.employmentType || "Full-time").toLowerCase();
      const filterType = filters.employmentType.toLowerCase();
      if (!jobType.includes(filterType) && jobType !== "not specified") return false;
    }

    if (filters.datePosted && filters.datePosted !== "" && job.postedAt) {
      const postedMs = new Date(job.postedAt).getTime();
      if (!isNaN(postedMs)) {
        const hoursAgo = (nowMs - postedMs) / (1000 * 60 * 60);
        if (filters.datePosted === "today" && hoursAgo > 24) return false;
        if (filters.datePosted === "week" && hoursAgo > 168) return false;
        if (filters.datePosted === "month" && hoursAgo > 720) return false;
      }
    }

    return true;
  });
}

export function dedupeJobsByTitleAndCompany<T extends FilterableJob>(jobs: T[]): T[] {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    const key = `${job.title.trim().toLowerCase()}::${job.companyName.trim().toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function paginateJobs<T>(jobs: T[], page: number, pageSize = 20) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (safePage - 1) * pageSize;

  return {
    items: jobs.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: safePage,
      limit: pageSize,
      total,
      totalPages,
    },
  };
}

export interface CursorPaginationOptions {
  cursor?: string;
  pageSize?: number;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
    pageSize: number;
  };
}

export function paginateWithCursor<T>(
  jobs: T[],
  options: CursorPaginationOptions,
  getCursorId: (item: T) => string,
): CursorPaginatedResult<T> {
  const { cursor, pageSize = 20 } = options;
  const total = jobs.length;
  
  let startIndex = 0;
  
  if (cursor) {
    const cursorIndex = jobs.findIndex((job) => getCursorId(job) === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }
  
  const items = jobs.slice(startIndex, startIndex + pageSize);
  const lastItem = items[items.length - 1];
  const nextCursor = lastItem ? getCursorId(lastItem) : null;
  
  return {
    items,
    pagination: {
      cursor: nextCursor,
      hasMore: startIndex + pageSize < total,
      total,
      pageSize,
    },
  };
}

// ─── Quick match ─────────────────────────────────────────────────────────────
//
// Transparent skill-overlap heuristic: what fraction of the user's known
// skills appear in the job text. It is NOT the AI fit score — the UI must
// label it "quick match" and the full analysis remains the real number.
// Kept deliberately simple so it can run instantly over a whole job feed.

export function quickMatchScore(
  userSkills: string[],
  jobText: string,
): { score: number; matched: string[] } {
  // Canonicalise first so "React and Next.js" from the CV parser counts as
  // React, and fragments like "and Python" don't count twice.
  const cleanSkills = [
    ...new Set(
      userSkills
        .flatMap((s) => canonicalizeSkill(s))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 1),
    ),
  ];
  if (cleanSkills.length === 0 || !jobText) return { score: 0, matched: [] };

  // Whole-token match; raw substring checks let "go" hit "Google" and "c"
  // hit everything.
  const canonicalByLower = new Map(Object.keys(SKILL_KEYWORDS).map((k) => [k.toLowerCase(), k]));
  const matched = cleanSkills.filter((skill) =>
    skillMentioned(jobText, canonicalByLower.get(skill) ?? skill),
  );

  // Denominator is capped so users with very long skill lists aren't
  // punished, and floored so one lucky hit can't read as a strong match.
  const denominator = Math.max(4, Math.min(cleanSkills.length, 10));
  const score = Math.min(95, Math.round((matched.length / denominator) * 100));

  return { score, matched };
}
