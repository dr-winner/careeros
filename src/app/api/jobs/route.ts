import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const SAMPLE_JOBS = [
  {
    title: "Frontend Developer",
    companyName: "TechHub Ghana",
    location: "Accra, Ghana",
    country: "Ghana",
    workMode: "Hybrid",
    seniorityLevel: "Mid-Level",
    employmentType: "Full-time",
    description: "We're looking for a skilled Frontend Developer to build responsive web applications using React and Next.js. You'll collaborate with our design team to create beautiful, user-friendly interfaces.",
    requirements: "React, TypeScript, CSS, Git, 2+ years experience",
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Software Engineer",
    companyName: "Andela",
    location: "Remote",
    country: "Nigeria",
    workMode: "Remote",
    seniorityLevel: "Senior",
    employmentType: "Full-time",
    description: "Join our engineering team to build scalable backend systems. You'll work with global clients on impactful projects.",
    requirements: "Node.js, Python, PostgreSQL, AWS, 4+ years experience",
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Data Analyst",
    companyName: "MTN Ghana",
    location: "Accra, Ghana",
    country: "Ghana",
    workMode: "On-site",
    seniorityLevel: "Entry-Level",
    employmentType: "Full-time",
    description: "Analyze large datasets to drive business decisions. Create reports and dashboards for stakeholders.",
    requirements: "Excel, SQL, Python, Tableau, degree in related field",
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "UX Designer",
    companyName: "Paystack",
    location: "Lagos, Nigeria",
    country: "Nigeria",
    workMode: "Hybrid",
    seniorityLevel: "Mid-Level",
    employmentType: "Full-time",
    description: "Design intuitive user experiences for our payment platform. Conduct user research and create wireframes and prototypes.",
    requirements: "Figma, user research, prototyping, 3+ years experience",
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Product Manager",
    companyName: "Flutterwave",
    location: "Nairobi, Kenya",
    country: "Kenya",
    workMode: "Hybrid",
    seniorityLevel: "Senior",
    employmentType: "Full-time",
    description: "Lead product development for our African payments ecosystem. Define roadmap and work closely with engineering teams.",
    requirements: "Product management, agile, fintech experience, MBA preferred",
    postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Backend Developer",
    companyName: "Jumia",
    location: "Lagos, Nigeria",
    country: "Nigeria",
    workMode: "On-site",
    seniorityLevel: "Mid-Level",
    employmentType: "Full-time",
    description: "Build and maintain scalable backend services for Africa's largest e-commerce platform.",
    requirements: "Java, Spring Boot, microservices, PostgreSQL, 3+ years",
    postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Digital Marketing Specialist",
    companyName: "Kobo360",
    location: "Accra, Ghana",
    country: "Ghana",
    workMode: "Hybrid",
    seniorityLevel: "Entry-Level",
    employmentType: "Full-time",
    description: "Drive digital marketing campaigns and manage social media presence for our logistics platform.",
    requirements: "SEO, Google Ads, social media, analytics, 1+ years experience",
    postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "DevOps Engineer",
    companyName: "GhanaWater",
    location: "Accra, Ghana",
    country: "Ghana",
    workMode: "On-site",
    seniorityLevel: "Senior",
    employmentType: "Full-time",
    description: "Manage infrastructure and deployment pipelines. Ensure high availability of critical services.",
    requirements: "AWS, Docker, Kubernetes, Terraform, CI/CD, 5+ years",
    postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Mobile Developer (Flutter)",
    companyName: "Carbon",
    location: "Lagos, Nigeria",
    country: "Nigeria",
    workMode: "Remote",
    seniorityLevel: "Mid-Level",
    employmentType: "Full-time",
    description: "Build mobile banking apps used by millions across Africa. Focus on performance and user experience.",
    requirements: "Flutter, Dart, iOS, Android, Firebase, 3+ years",
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: "Business Analyst",
    companyName: "Ghana Revenue Authority",
    location: "Accra, Ghana",
    country: "Ghana",
    workMode: "On-site",
    seniorityLevel: "Entry-Level",
    employmentType: "Full-time",
    description: "Analyze business processes and recommend improvements. Work with stakeholders to implement solutions.",
    requirements: "Business analysis, Excel, PowerPoint, degree in business/IT",
    postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const workMode = searchParams.get("workMode") || "";
    const seniority = searchParams.get("seniority") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let jobs = SAMPLE_JOBS;

    if (search) {
      const searchLower = search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.companyName.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower)
      );
    }

    if (location) {
      jobs = jobs.filter((job) =>
        job.location.toLowerCase().includes(location.toLowerCase()) ||
        job.country.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (workMode) {
      jobs = jobs.filter((job) => job.workMode === workMode);
    }

    if (seniority) {
      jobs = jobs.filter((job) => job.seniorityLevel === seniority);
    }

    const total = jobs.length;
    const start = (page - 1) * limit;
    const paginatedJobs = jobs.slice(start, start + limit);

    let savedJobIds: string[] = [];
    if (userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        select: { jobId: true },
      });
      savedJobIds = savedJobs.map((sj: { jobId: string }) => sj.jobId);
    }

    const jobsWithMeta = paginatedJobs.map((job, index) => {
      const jobId = `sample-${index + 1}`;
      return {
        ...job,
        id: jobId,
        isSaved: savedJobIds.includes(jobId),
        applicationUrl: `https://example.com/apply/${jobId}`,
      };
    });

    return NextResponse.json({
      jobs: jobsWithMeta,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
