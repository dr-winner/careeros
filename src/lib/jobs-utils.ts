export interface JobFilters {
  workMode?: string;
  seniority?: string;
  location?: string;
  search?: string;
}

export interface FilterableJob {
  title: string;
  companyName: string;
  location: string;
  country: string;
  workMode: string;
  seniorityLevel: string;
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
  const loc = String(location || "").toLowerCase();

  // Africa
  if (loc.includes("nigeria") || loc.includes("lagos") || loc.includes("abuja")) return "NG";
  if (loc.includes("ghana") || loc.includes("accra")) return "GH";
  if (loc.includes("kenya") || loc.includes("nairobi")) return "KE";
  if (loc.includes("south africa") || loc.includes("johannesburg") || loc.includes("cape town")) return "ZA";
  if (loc.includes("africa")) return "ZA";

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

  return "ZA";
}

export function filterJobs<T extends FilterableJob>(
  jobs: T[],
  filters: JobFilters,
): T[] {
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

    if (filters.search && filters.search !== "") {
      const search = filters.search.toLowerCase();

      if (
        !job.title.toLowerCase().includes(search) &&
        !job.companyName.toLowerCase().includes(search)
      ) {
        return false;
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
