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

function normalizeLoc(location: unknown): string {
  return String(location || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Phrase match, or whole-token match so "india" does not hit "indiana". */
function locHas(loc: string, needle: string): boolean {
  if (!needle) return false;
  if (needle.includes(" ") || needle.startsWith(",") || needle.startsWith(".")) {
    return loc.includes(needle);
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(loc);
}

function locHasAny(loc: string, needles: string[]): boolean {
  return needles.some((n) => locHas(loc, n));
}

const GH_LOCATION_NEEDLES = [
  "ghana", "accra", "kumasi", "tema", "takoradi", "cape coast", "tamale",
  "sunyani", "teshie", "ashanti", "volta region",
];
const NG_LOCATION_NEEDLES = [
  "nigeria", "lagos", "abuja", "port harcourt", "ibadan", "kano", "enugu",
  "benin city", "onitsha", "kaduna", "uyo",
];
const KE_LOCATION_NEEDLES = ["kenya", "nairobi", "mombasa", "kisumu"];
const ZA_LOCATION_NEEDLES = [
  "south africa", "johannesburg", "cape town", "durban", "pretoria", "soweto",
  "western cape", "gauteng", "ekurhuleni", "port elizabeth", "gqeberha",
  "nelson mandela", "bloemfontein", "sandton", "stellenbosch", "paarl",
  "centurion", "randburg", "polokwane",
];
const CA_LOCATION_NEEDLES = [
  "canada", "toronto", "vancouver", "montreal", "ottawa", "calgary", "edmonton",
  "winnipeg", "halifax", "kelowna", "alberta", "saskatchewan",
  "manitoba", "ontario", "quebec", "okanagan", "saskatoon", "regina", "red deer",
];
const US_LOCATION_NEEDLES = [
  "united states", "usa", "u.s.", "new york", "san francisco", "austin",
  "seattle", "chicago", "boston", "denver", "atlanta", "dallas", "houston",
  "miami", "los angeles", "washington", "herndon", "arlington", "longmont",
  "tempe", "fairfax", "boulder", ", tx", ", ca", ", ny", ", va", ", il",
  ", co", ", ma", ", ga", ", az", ", pa", ", fl", ", wa",
  "pennsylvania", "eastern united states",
];
const GB_LOCATION_NEEDLES = [
  "united kingdom", "london", "manchester", "birmingham", "leeds",
  "bournemouth", "knutsford", ", uk", "england", "scotland", "wales", "uk",
];
const MX_LOCATION_NEEDLES = ["mexico", "mexico city", "guadalajara", "monterrey", "latam", "latin america"];
const ES_LOCATION_NEEDLES = ["spain", "madrid", "barcelona"];
const SE_LOCATION_NEEDLES = ["sweden", "stockholm", "gothenburg"];
const TH_LOCATION_NEEDLES = ["thailand", "bangkok"];
const BR_LOCATION_NEEDLES = ["brazil", "brasil", "sao paulo", "rio de janeiro"];
const PL_LOCATION_NEEDLES = ["poland", "warsaw", "krakow", "wroclaw"];
const TR_LOCATION_NEEDLES = ["turkey", "turkiye", "istanbul", "ankara"];
const APAC_LOCATION_NEEDLES = ["apac", "asia-pacific", "asia pacific", "southeast asia"];
const EU_LOCATION_NEEDLES = [
  "europe", "emea", "eu-wide", "netherlands", "amsterdam", "germany", "berlin",
  "munich", "france", "paris",
];
const IN_LOCATION_NEEDLES = [
  "india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "chennai",
  "noida", "ahmedabad", "pune", "gurgaon", "gurugram", "kolkata", "jaipur",
  "coimbatore", "ghaziabad", "telangana", "tamil nadu", "gujarat", "karnataka",
  "maharashtra", "haryana",
];
const AU_LOCATION_NEEDLES = [
  "australia", "sydney", "melbourne", "brisbane", "perth", "adelaide",
  "gosnells", "kenwick",
];

const WORLDWIDE_LOCATION_EXACT = new Set([
  "",
  "remote",
  "worldwide",
  "anywhere",
  "global",
  "work from home",
  "wfh",
  "not specified",
  "n/a",
  "na",
  "-",
  "unspecified",
  "location unspecified",
  "no location specified",
]);

const WORLDWIDE_LOCATION_TOKENS = new Set([
  "remote", "worldwide", "anywhere", "global", "fully", "the", "world",
  "work", "from", "home", "wfh", "only",
]);

export function isWorldwideLocation(location: unknown): boolean {
  const loc = normalizeLoc(location);
  if (WORLDWIDE_LOCATION_EXACT.has(loc)) return true;
  const stripped = loc.replace(/[()/,|._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (WORLDWIDE_LOCATION_EXACT.has(stripped)) return true;
  const tokens = stripped.split(" ").filter((t) => t.length > 0);
  return tokens.length > 0 && tokens.every((t) => WORLDWIDE_LOCATION_TOKENS.has(t));
}

function looksLikeSpecificPlace(location: unknown): boolean {
  const loc = normalizeLoc(location);
  if (!loc || isWorldwideLocation(loc)) return false;
  if (loc.includes(",")) return true;
  return loc.split(/\s+/).filter(Boolean).length >= 2;
}

export function getCountry(source: string, location: unknown): string {
  const loc = normalizeLoc(location);

  if (locHasAny(loc, GH_LOCATION_NEEDLES)) return "GH";
  if (locHasAny(loc, NG_LOCATION_NEEDLES) || loc.includes("aba,")) return "NG";
  if (locHasAny(loc, KE_LOCATION_NEEDLES)) return "KE";
  if (locHasAny(loc, ZA_LOCATION_NEEDLES)) return "ZA";

  // Pin a specific country before the generic "Africa" token. "Africa, PA"
  // is Pennsylvania; "Remote - Mexico" is Mexico — not a Ghana listing.
  if (locHasAny(loc, CA_LOCATION_NEEDLES)) return "CA";
  if (locHasAny(loc, US_LOCATION_NEEDLES)) return "US";
  if (locHasAny(loc, GB_LOCATION_NEEDLES)) return "GB";
  if (locHasAny(loc, MX_LOCATION_NEEDLES)) return "MX";
  if (locHasAny(loc, ES_LOCATION_NEEDLES)) return "ES";
  if (locHasAny(loc, SE_LOCATION_NEEDLES)) return "SE";
  if (locHasAny(loc, TH_LOCATION_NEEDLES)) return "TH";
  if (locHasAny(loc, BR_LOCATION_NEEDLES)) return "BR";
  if (locHasAny(loc, PL_LOCATION_NEEDLES)) return "PL";
  if (locHasAny(loc, TR_LOCATION_NEEDLES)) return "TR";
  if (locHasAny(loc, APAC_LOCATION_NEEDLES)) return "APAC";
  if (locHasAny(loc, ["germany", "berlin", "munich"])) return "DE";
  if (locHasAny(loc, ["france", "paris"])) return "FR";
  if (locHasAny(loc, EU_LOCATION_NEEDLES)) return "EU";
  if (locHasAny(loc, AU_LOCATION_NEEDLES)) return "AU";
  if (locHasAny(loc, IN_LOCATION_NEEDLES)) return "IN";
  if (locHas(loc, "singapore")) return "SG";

  if (loc.includes("west africa")) return "AF";
  if (locHas(loc, "africa")) return "AF";

  if (source === "remotive" || source === "remoteok" || source === "jobicy") return "GLOBAL";
  if (source === "arbeitnow") return "EU";
  if (source === "themuse") return "US";

  return "GLOBAL";
}

export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  ghana: "GH",
  nigeria: "NG",
  kenya: "KE",
  "south africa": "ZA",
};

/** Map a profile country string ("Ghana") or code ("GH") to a jobs filter code. */
export function countryNameToCode(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "";
  const upper = n.toUpperCase();
  if (["GH", "NG", "KE", "ZA", "GB", "US", "CA", "AU", "IN", "REMOTE"].includes(upper)) {
    return upper;
  }
  return COUNTRY_NAME_TO_CODE[n.toLowerCase()] || "";
}

export const JOBS_LIST_STORAGE_KEY = "careeros:jobs-list";

/** External boards queried on each browse. Employer posts are extra. */
export const JOB_FEED_SOURCE_COUNT = 13;

/** Build /jobs?... from an alert or the last list view so Back/Search keep Ghana. */
export function jobsListHref(opts: {
  search?: string | null;
  location?: string | null;
  country?: string | null;
  workMode?: string | null;
}): string {
  const params = new URLSearchParams();
  const search = (opts.search || "").trim();
  if (search) params.set("search", search);
  const fromLocation = getCountry("", opts.location || "");
  const country =
    countryNameToCode(opts.country) ||
    (fromLocation !== "GLOBAL" && fromLocation !== "AF" && fromLocation !== "EU"
      ? fromLocation
      : "") ||
    countryNameToCode(opts.location);
  if (country) params.set("country", country);
  const wm = (opts.workMode || "").trim();
  if (wm) params.set("workMode", wm);
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

const SEARCH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "in", "to", "at", "on",
]);

// Ghana / Nigeria / Kenya / South Africa also keep pan-African listings
// and unpinned worldwide remote — never a foreign office that geocoded as GLOBAL.
const AFRICAN_MARKET_CODES = new Set(["GH", "NG", "KE", "ZA", "AF"]);

const COUNTRY_LOCATION_HINTS: Record<string, string[]> = {
  GH: GH_LOCATION_NEEDLES,
  NG: NG_LOCATION_NEEDLES,
  KE: KE_LOCATION_NEEDLES,
  ZA: ZA_LOCATION_NEEDLES,
  GB: GB_LOCATION_NEEDLES,
  US: US_LOCATION_NEEDLES,
  CA: CA_LOCATION_NEEDLES,
  IN: IN_LOCATION_NEEDLES,
  AU: AU_LOCATION_NEEDLES,
};

// Titles that share a token with a real search ("security") but are not
// professional roles the searcher meant.
const NOISE_ROLE_TITLE =
  /\b(guard|watchman|driver|cleaner|cook|waiter|cashier|hawker|nanny|househelp|kitchen|chef|janitor|steward)\b/i;

/** Mix one home-country listing after this many role-relevant jobs. */
const HOME_MIX_EVERY = 3;

const TITLE_PHRASE_SCORE = 40;
const TITLE_ALL_TOKENS_SCORE = 30;
const TITLE_SOME_TOKENS_SCORE = 15;
const BODY_PHRASE_SCORE = 12;
const BODY_ALL_TOKENS_SCORE = 8;

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

function locCountryOf(job: FilterableJob): string {
  const fromLoc = getCountry("", job.location);
  if (fromLoc !== "GLOBAL") return fromLoc;
  return (job.country || "GLOBAL").toUpperCase();
}

function isRemoteWork(job: FilterableJob): boolean {
  return job.workMode.toLowerCase().includes("remote");
}

/**
 * Country this job is pinned to, or null if it is genuinely worldwide.
 * Re-geocodes the location string so a cached `country: "GLOBAL"` on
 * "Hyderabad, Telangana" does not count as worldwide.
 */
export function pinnedCountryCode(job: FilterableJob): string | null {
  const fromLoc = getCountry("", job.location);
  if (fromLoc !== "GLOBAL") return fromLoc;

  const fromTitle = getCountry("", job.title);
  if (fromTitle !== "GLOBAL") return fromTitle;

  const stored = (job.country || "").trim().toUpperCase();
  if (stored && stored !== "GLOBAL" && stored !== "REMOTE" && stored !== "AF") return stored;

  if (isWorldwideLocation(job.location)) return null;
  if (looksLikeSpecificPlace(job.location)) return "UNKNOWN";
  return null;
}

/**
 * Ghana (and NG/KE/ZA) means that country, pan-African listings, and
 * unpinned worldwide remote — not "any GLOBAL geocode" and not a remote
 * job sitting in Hyderabad, New York, or Kelowna.
 */
export function jobMatchesCountry(job: FilterableJob, country: string): boolean {
  if (!country) return true;

  if (country === "REMOTE") {
    return isRemoteWork(job) || isWorldwideLocation(job.location);
  }

  const locCountry = getCountry("", job.location);
  if (locCountry === country) return true;

  const loc = normalizeLoc(job.location);
  const hints = COUNTRY_LOCATION_HINTS[country];
  if (hints?.some((h) => locHas(loc, h))) return true;

  // Trust stored country only when the location string does not name a
  // different specific country (cached GLOBAL/GH on a Hyderabad office).
  const locationContradicts =
    locCountry !== "GLOBAL" && locCountry !== "AF" && locCountry !== country;
  if (job.country === country && !locationContradicts) return true;

  if (AFRICAN_MARKET_CODES.has(country)) {
    // Bare "Africa" / West Africa — not "Africa, PA" (already US) and not EMEA.
    if (locCountry === "AF" && !locationContradicts) return true;
    if (isRemoteWork(job)) {
      const pinned = pinnedCountryCode(job);
      if (pinned === null || pinned === country || pinned === "AF") return true;
    }
  }

  return false;
}

function isHomeCountryJob(job: FilterableJob, homeCountry: string): boolean {
  const loc = normalizeLoc(job.location);
  const hints = COUNTRY_LOCATION_HINTS[homeCountry] || [];
  return (
    job.country === homeCountry ||
    locCountryOf(job) === homeCountry ||
    hints.some((h) => locHas(loc, h))
  );
}

function postedTimeMs(job: { postedAt?: string }): number {
  const t = new Date(job.postedAt || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortByRoleThenHomeThenTime<T extends FilterableJob>(
  jobs: T[],
  desiredRole: string,
  homeCountry: string,
): T[] {
  return [...jobs].sort((a, b) => {
    if (desiredRole.trim()) {
      const role = roleRelevanceBoost(b, desiredRole) - roleRelevanceBoost(a, desiredRole);
      if (role !== 0) return role;
    }
    const homeA = isHomeCountryJob(a, homeCountry) ? 0 : 1;
    const homeB = isHomeCountryJob(b, homeCountry) ? 0 : 1;
    if (homeA !== homeB) return homeA - homeB;
    return postedTimeMs(b) - postedTimeMs(a);
  });
}

function interleaveOneHomeTwoRest<T>(home: T[], rest: T[]): T[] {
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

/**
 * Ghana (and NG/KE/ZA) empty browse: role-relevant jobs first (title or
 * body), then a light mix of local listings so page 1 is not a wall of
 * worldwide remotes. Unrelated leftovers stay 1 local : 2 others.
 * With no target role, keep the 1:2 mix so locals are not buried.
 */
export function interleaveHomeAndRemote<T extends FilterableJob>(
  jobs: T[],
  homeCountry: string,
  desiredRole = "",
): T[] {
  const home: T[] = [];
  const rest: T[] = [];
  for (const job of jobs) {
    if (isHomeCountryJob(job, homeCountry)) home.push(job);
    else rest.push(job);
  }

  if (!desiredRole.trim()) {
    return interleaveOneHomeTwoRest(home, rest);
  }

  const relevant = sortByRoleThenHomeThenTime(
    jobs.filter((job) => roleRelevanceBoost(job, desiredRole) > 0),
    desiredRole,
    homeCountry,
  );
  const unrelatedHome: T[] = [];
  const unrelatedRest: T[] = [];
  for (const job of jobs) {
    if (roleRelevanceBoost(job, desiredRole) > 0) continue;
    if (isHomeCountryJob(job, homeCountry)) unrelatedHome.push(job);
    else unrelatedRest.push(job);
  }

  const out: T[] = [];
  let hi = 0;
  for (let r = 0; r < relevant.length; r++) {
    out.push(relevant[r]);
    if ((r + 1) % HOME_MIX_EVERY === 0 && hi < unrelatedHome.length) {
      out.push(unrelatedHome[hi++]);
    }
  }
  if (relevant.length > 0 && relevant.length < HOME_MIX_EVERY && hi < unrelatedHome.length) {
    out.push(unrelatedHome[hi++]);
  }

  return out.concat(interleaveOneHomeTwoRest(unrelatedHome.slice(hi), unrelatedRest));
}

export type RoleBoostJob = {
  title: string;
  description?: string;
  requirements?: string;
};

/**
 * Rank (do not filter) by overlap with the user's target role.
 * Title hits stay far above description-only hits. Body matches need a
 * multi-word phrase or every token — a lone "cloud" in a sales JD does
 * not count. Noise titles (guard, kitchen, …) score 0.
 */
export function roleRelevanceBoost(job: RoleBoostJob, desiredRole: string): number {
  const role = desiredRole.trim().toLowerCase();
  if (!role) return 0;
  if (NOISE_ROLE_TITLE.test(job.title)) return 0;

  const title = job.title.toLowerCase();
  const tokens = tokenizeSearch(role);

  let titleScore = 0;
  if (title.includes(role)) {
    titleScore = TITLE_PHRASE_SCORE;
  } else if (tokens.length > 0) {
    const hits = tokens.filter((t) => title.includes(t)).length;
    if (hits === tokens.length) titleScore = TITLE_ALL_TOKENS_SCORE;
    else if (hits > 0) titleScore = TITLE_SOME_TOKENS_SCORE;
  }

  const body = `${job.description || ""} ${job.requirements || ""}`.toLowerCase();
  let bodyScore = 0;
  if (tokens.length >= 2 && body.trim()) {
    if (body.includes(role)) bodyScore = BODY_PHRASE_SCORE;
    else if (tokens.every((t) => body.includes(t))) bodyScore = BODY_ALL_TOKENS_SCORE;
  }

  if (titleScore === 0) return bodyScore;
  if (titleScore >= TITLE_ALL_TOKENS_SCORE) return titleScore;
  return titleScore + bodyScore;
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
