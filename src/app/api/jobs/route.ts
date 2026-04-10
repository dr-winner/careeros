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
  category?: { tag: string; label: string };
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "South Africa";
    const page = parseInt(searchParams.get("page") || "1");

    let savedJobIds: string[] = [];
    if (userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        select: { externalJobId: true },
      });
      savedJobIds = savedJobs.map((sj: { externalJobId: string }) => sj.externalJobId);
    }

    if (jobId) {
      return await fetchJobById(jobId, userId, savedJobIds);
    }

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      let country = location.toLowerCase().includes("nigeria")
        ? "ng"
        : location.toLowerCase().includes("kenya")
        ? "ke"
        : location.toLowerCase().includes("south africa")
        ? "za"
        : location.toLowerCase().includes("ghana")
        ? "gh"
        : null;

      if (!country || ["ng", "ke", "gh"].includes(country)) {
        country = "za";
      }

      const query = search || "software developer";
      const searchLocation = "South Africa";
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(searchLocation)}&results_per_page=20`;

      console.log("Fetching from Adzuna:", url);

      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Adzuna response:", { count: data.count, resultsLength: data.results?.length });

        if (data.results && data.results.length > 0) {
          const jobs = data.results.map((job: AdzunaJob) => ({
            id: `adzuna-${job.id}`,
            title: job.title,
            companyName: job.company.display_name,
            location: job.location.display_name,
            country: country.toUpperCase(),
            workMode: job.contract_time?.includes("contract") ? "Contract" : "Full-time",
            seniorityLevel: "Not specified",
            employmentType: job.contract_time || "Full-time",
            description: job.description.replace(/<[^>]*>/g, "").substring(0, 500),
            requirements: "See job posting for details",
            postedAt: job.created,
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            isSaved: savedJobIds.includes(`adzuna-${job.id}`),
            applicationUrl: job.redirect_url,
            source: "adzuna",
          }));

          return NextResponse.json({
            jobs,
            pagination: {
              page,
              limit: 20,
              total: data.count || 0,
              totalPages: Math.ceil((data.count || 0) / 20),
            },
            source: "adzuna",
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
      const formattedJob = {
        id: `adzuna-${job.id}`,
        title: job.title,
        companyName: job.company.display_name,
        location: job.location.display_name,
        country: "ZA",
        workMode: job.contract_time?.includes("contract") ? "Contract" : "Full-time",
        seniorityLevel: "Not specified",
        employmentType: job.contract_time || "Full-time",
        description: job.description.replace(/<[^>]*>/g, ""),
        requirements: "See job posting for details",
        postedAt: job.created,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        isSaved: savedJobIds.includes(`adzuna-${job.id}`),
        applicationUrl: job.redirect_url,
        source: "adzuna",
      };

      return NextResponse.json({ job: formattedJob });
    }

    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
