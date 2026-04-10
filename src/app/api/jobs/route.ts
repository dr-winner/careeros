import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

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

interface ApiJob {
  id: string;
  slug?: string;
  title: string;
  company_name?: string;
  company?: { display_name: string };
  location?: string;
  location_data?: { display_name?: string };
  description: string;
  url?: string;
  redirect_url?: string;
  created?: string;
  created_at?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  remote?: boolean;
  candidate_required_location?: string;
  job_type?: string;
}

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
  return "Full-time";
}

function parseSalary(salary?: string): { min?: number; max?: number } {
  if (!salary) return {};
  
  const numbers = salary.match(/\d+/g);
  if (!numbers || numbers.length === 0) return {};
  
  const nums = numbers.map(n => parseInt(n) * 1000);
  
  if (nums.length === 2) {
    return { min: Math.min(...nums), max: Math.max(...nums) };
  }
  return { min: nums[0] };
}

function formatJob(rawJob: ApiJob, sourceId: string, source: string, savedJobIds: string[]): Job {
  const companyName = rawJob.company_name || rawJob.company?.display_name || "Unknown Company";
  const location = rawJob.location || rawJob.location_data?.display_name || rawJob.candidate_required_location || "Not specified";
  const appUrl = rawJob.url || rawJob.redirect_url || "#";
  const postedAt = rawJob.created || rawJob.created_at || new Date().toISOString();
  const description = rawJob.description?.replace(/<[^>]*>/g, "").substring(0, 500) || "";
  
  const salary = parseSalary(rawJob.salary_min || rawJob.salary_max ? String(rawJob.salary_min || rawJob.salary_max) : undefined);
  
  return {
    id: `${source}-${sourceId}`,
    title: rawJob.title,
    companyName,
    location,
    country: source === "adzuna" ? "ZA" : source === "remotive" ? "GLOBAL" : "EU",
    workMode: rawJob.remote ? "Remote" : getWorkMode(rawJob.remote, rawJob.job_type || rawJob.contract_time),
    seniorityLevel: detectSeniority(rawJob.title),
    employmentType: rawJob.job_type || rawJob.contract_time || rawJob.contract_type || "Full-time",
    description,
    requirements: "See job posting for details",
    postedAt,
    salaryMin: rawJob.salary_min || salary.min,
    salaryMax: rawJob.salary_max || salary.max,
    isSaved: savedJobIds.includes(`${source}-${sourceId}`),
    applicationUrl: appUrl,
    source,
  };
}

function filterJobs(jobs: Job[], filters: {
  workMode?: string;
  seniority?: string;
  location?: string;
  search?: string;
}): Job[] {
  return jobs.filter(job => {
    if (filters.workMode && filters.workMode !== "") {
      if (filters.workMode === "Remote" && !job.workMode.toLowerCase().includes("remote")) {
        return false;
      }
      if (filters.workMode === "Full-time" && job.workMode === "Remote") {
        return true;
      }
      if (filters.workMode !== "Remote" && filters.workMode !== "Full-time" && job.workMode !== filters.workMode && job.workMode !== "Not specified") {
        return false;
      }
    }
    
    if (filters.seniority && filters.seniority !== "") {
      if (job.seniorityLevel !== filters.seniority) {
        return false;
      }
    }
    
    if (filters.location && filters.location !== "") {
      const loc = filters.location.toLowerCase();
      if (!job.location.toLowerCase().includes(loc) && 
          !job.country.toLowerCase().includes(loc)) {
        return false;
      }
    }
    
    if (filters.search && filters.search !== "") {
      const search = filters.search.toLowerCase();
      if (!job.title.toLowerCase().includes(search) && 
          !job.companyName.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    return true;
  });
}

async function fetchFromAdzuna(query: string, savedJobIds: string[]): Promise<Job[]> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=South+Africa&results_per_page=15`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((job: ApiJob) => formatJob(job, job.id, "adzuna", savedJobIds));
    }
  } catch (error) {
    console.error("Adzuna error:", error);
  }
  
  return [];
}

async function fetchFromRemotive(query: string, savedJobIds: string[]): Promise<Job[]> {
  try {
    const searchTerm = encodeURIComponent(query);
    const url = `https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=20`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.jobs && Array.isArray(data.jobs)) {
      return data.jobs.map((job: ApiJob) => formatJob(job, job.id, "remotive", savedJobIds));
    }
  } catch (error) {
    console.error("Remotive error:", error);
  }
  
  return [];
}

async function fetchFromArbeitnow(query: string, savedJobIds: string[]): Promise<Job[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      const jobs = data.data
        .filter((job: ApiJob) => 
          !query || job.title.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 15)
        .map((job: ApiJob) => formatJob(job, job.slug || job.id, "arbeitnow", savedJobIds));
      return jobs;
    } else if (Array.isArray(data)) {
      return data
        .filter((job: ApiJob) => 
          !query || job.title.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 15)
        .map((job: ApiJob) => formatJob(job, job.slug || job.id, "arbeitnow", savedJobIds));
    }
  } catch (error) {
    console.error("Arbeitnow error:", error);
  }
  
  return [];
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
    const sources = searchParams.get("sources") || "all";

    let savedJobIds: string[] = [];
    if (userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        select: { externalJobId: true },
      });
      savedJobIds = savedJobs.map((sj) => sj.externalJobId);
    }

    if (jobId) {
      const [source, id] = jobId.split("-").length > 2 
        ? [jobId.split("-")[0], jobId.split("-").slice(1).join("-")]
        : ["", ""];
      
      if (source === "remotive") {
        try {
          const response = await fetch(`https://remotive.com/api/remote-jobs/${id}`);
          const data = await response.json();
          if (data.jobs && data.jobs[0]) {
            return NextResponse.json({ job: formatJob(data.jobs[0], id, "remotive", savedJobIds) });
          }
        } catch {}
      }
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const query = search || "software developer";
    const resultsPerPage = 20;
    const allJobs: Job[] = [];

    const fetchPromises: Promise<Job[]>[] = [];
    
    if (sources === "all" || sources === "adzuna") {
      fetchPromises.push(fetchFromAdzuna(query, savedJobIds));
    }
    if (sources === "all" || sources === "remotive") {
      fetchPromises.push(fetchFromRemotive(query, savedJobIds));
    }
    if (sources === "all" || sources === "arbeitnow") {
      fetchPromises.push(fetchFromArbeitnow(query, savedJobIds));
    }

    const results = await Promise.allSettled(fetchPromises);
    
    for (const result of results) {
      if (result.status === "fulfilled") {
        allJobs.push(...result.value);
      }
    }

    const filteredJobs = filterJobs(allJobs, { workMode, seniority, location, search });

    const totalResults = filteredJobs.length;
    const startIndex = (page - 1) * resultsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + resultsPerPage);

    const sourcesBreakdown = {
      adzuna: allJobs.filter(j => j.source === "adzuna").length,
      remotive: allJobs.filter(j => j.source === "remotive").length,
      arbeitnow: allJobs.filter(j => j.source === "arbeitnow").length,
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
