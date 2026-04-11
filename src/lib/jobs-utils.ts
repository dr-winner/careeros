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

  if (
    loc.includes("africa") ||
    loc.includes("nigeria") ||
    loc.includes("ghana") ||
    loc.includes("kenya") ||
    loc.includes("south africa")
  ) {
    return "AFRICA";
  }

  if (
    loc.includes("europe") ||
    loc.includes("germany") ||
    loc.includes("uk") ||
    loc.includes("france")
  ) {
    return "EU";
  }

  if (
    loc.includes("usa") ||
    loc.includes("united states") ||
    loc.includes("america")
  ) {
    return "USA";
  }

  if (
    loc.includes("asia") ||
    loc.includes("india") ||
    loc.includes("china")
  ) {
    return "ASIA";
  }

  if (source === "remotive") return "GLOBAL";
  if (source === "arbeitnow") return "EU";

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
