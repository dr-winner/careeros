import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  category?: { tag: string; label: string };
}

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

function getWorkMode(job: AdzunaJob): string {
  if (job.contract_time?.includes("contract") || job.contract_type === "contract") {
    return "Contract";
  }
  if (job.contract_time === "full_time") {
    return "Full-time";
  }
  return "Not specified";
}

function formatJob(job: AdzunaJob, country: string, savedJobIds: string[]): Job {
  return {
    id: `adzuna-${job.id}`,
    title: job.title,
    companyName: job.company.display_name,
    location: job.location.display_name,
    country: country.toUpperCase(),
    workMode: getWorkMode(job),
    seniorityLevel: detectSeniority(job.title),
    employmentType: job.contract_time || job.contract_type || "Full-time",
    description: job.description.replace(/<[^>]*>/g, "").substring(0, 500),
    requirements: "See job posting for details",
    postedAt: job.created,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    isSaved: savedJobIds.includes(`adzuna-${job.id}`),
    applicationUrl: job.redirect_url,
    source: "adzuna",
  };
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

function filterJobs(jobs: Job[], filters: {
  workMode?: string;
  seniority?: string;
  location?: string;
}): Job[] {
  return jobs.filter(job => {
    if (filters.workMode && filters.workMode !== "") {
      if (job.workMode !== filters.workMode && job.workMode !== "Not specified") {
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
    
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "South Africa";
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
      return await fetchJobById(jobId, userId, savedJobIds);
    }

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      const country = location.toLowerCase().includes("nigeria")
        ? "ng"
        : location.toLowerCase().includes("kenya")
        ? "ke"
        : location.toLowerCase().includes("south africa")
        ? "za"
        : location.toLowerCase().includes("ghana")
        ? "gh"
        : "za";

      const query = search || "software developer";
      const searchLocation = "South Africa";
      
      const resultsPerPage = 50;
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(searchLocation)}&results_per_page=${resultsPerPage}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          let jobs = data.results.map((job: AdzunaJob) => formatJob(job, country, savedJobIds));
          
          jobs = filterJobs(jobs, { workMode, seniority, location });
          
          const totalResults = data.count || jobs.length;
          const filteredTotal = jobs.length;
          const actualTotalPages = Math.ceil(totalResults / resultsPerPage);

          return NextResponse.json({
            jobs: jobs.slice(0, 20),
            pagination: {
              page,
              limit: 20,
              total: filteredTotal,
              totalPages: actualTotalPages,
            },
            source: "adzuna",
            filters: { search, location, workMode, seniority },
          });
        }
      } catch (error) {
        console.error("Adzuna API error:", error);
      }
    }

    return NextResponse.json({
      jobs: [],
      pagination: { page, limit: 20, total: 0, totalPages: 0 },
      source: "none",
      message: "No jobs found. Try a different search or check back later.",
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

async function fetchJobById(jobId: string, userId: string | null, savedJobIds: string[]) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return NextResponse.json({ error: "Job API not configured" }, { status: 500 });
  }

  const adzunaId = jobId.replace("adzuna-", "");
  
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(adzunaId)}&results_per_page=1`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const job = data.results[0];
      const formattedJob = formatJob(job, "za", savedJobIds);

      return NextResponse.json({ job: formattedJob });
    }

    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
