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

    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "Ghana";
    const page = parseInt(searchParams.get("page") || "1");

    let savedJobIds: string[] = [];
    if (userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        select: { externalJobId: true },
      });
      savedJobIds = savedJobs.map((sj: { externalJobId: string }) => sj.externalJobId);
    }

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      const country = location.toLowerCase().includes("nigeria")
        ? "ng"
        : location.toLowerCase().includes("kenya")
        ? "ke"
        : location.toLowerCase().includes("south africa")
        ? "za"
        : "gh";

      const query = search || "software developer";
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&results_per_page=20`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results) {
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
    }

    const sampleJobs = getSampleJobs(search, location, savedJobIds);
    return NextResponse.json({
      jobs: sampleJobs,
      pagination: {
        page,
        limit: 10,
        total: sampleJobs.length,
        totalPages: 1,
      },
      source: "sample",
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

function getSampleJobs(search: string, location: string, savedJobIds: string[]) {
  const SAMPLE_JOBS = [
    {
      title: "Frontend Developer",
      companyName: "TechHub Ghana",
      location: "Accra, Ghana",
      country: "Ghana",
      workMode: "Hybrid",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Looking for a skilled Frontend Developer to build responsive web applications using React and Next.js.",
      requirements: "React, TypeScript, CSS, Git",
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
      description: "Join our engineering team to build scalable backend systems for global clients.",
      requirements: "Node.js, Python, PostgreSQL, AWS",
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
      description: "Analyze large datasets to drive business decisions and create reports for stakeholders.",
      requirements: "Excel, SQL, Python, Tableau",
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
      description: "Design intuitive user experiences for our payment platform.",
      requirements: "Figma, user research, prototyping",
      postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Backend Developer",
      companyName: "Flutterwave",
      location: "Nairobi, Kenya",
      country: "Kenya",
      workMode: "Hybrid",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Build and maintain scalable backend services for Africa's fintech ecosystem.",
      requirements: "Java, Spring Boot, microservices, PostgreSQL",
      postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Product Manager",
      companyName: "Jumia",
      location: "Lagos, Nigeria",
      country: "Nigeria",
      workMode: "Hybrid",
      seniorityLevel: "Senior",
      employmentType: "Full-time",
      description: "Lead product strategy and roadmap for our e-commerce platform serving millions of customers across Africa.",
      requirements: "Product management, Agile, data analysis, stakeholder management",
      postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "DevOps Engineer",
      companyName: "KoboShop",
      location: "Accra, Ghana",
      country: "Ghana",
      workMode: "Remote",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Manage CI/CD pipelines, cloud infrastructure, and ensure 99.9% uptime for our e-commerce platform.",
      requirements: "AWS, Docker, Kubernetes, Terraform, Linux",
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Marketing Coordinator",
      companyName: "M-KOPA Solar",
      location: "Nairobi, Kenya",
      country: "Kenya",
      workMode: "On-site",
      seniorityLevel: "Entry-Level",
      employmentType: "Full-time",
      description: "Coordinate marketing campaigns and social media initiatives for our solar energy products.",
      requirements: "Marketing, social media, copywriting, analytics",
      postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Mobile Developer (React Native)",
      companyName: "TymeBank",
      location: "Cape Town, South Africa",
      country: "South Africa",
      workMode: "Hybrid",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Build and maintain mobile banking applications serving millions of South African customers.",
      requirements: "React Native, TypeScript, iOS, Android",
      postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Customer Success Manager",
      companyName: "Interswitch",
      location: "Lagos, Nigeria",
      country: "Nigeria",
      workMode: "On-site",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Manage relationships with enterprise clients and ensure successful adoption of our payment solutions.",
      requirements: "Client management, communication, problem-solving",
      postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Data Scientist",
      companyName: "M-Pesa",
      location: "Nairobi, Kenya",
      country: "Kenya",
      workMode: "Hybrid",
      seniorityLevel: "Senior",
      employmentType: "Full-time",
      description: "Develop machine learning models to detect fraud and improve financial services for millions of users.",
      requirements: "Python, TensorFlow, SQL, statistics, ML",
      postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Graphic Designer",
      companyName: "Nairobi Design Institute",
      location: "Nairobi, Kenya",
      country: "Kenya",
      workMode: "On-site",
      seniorityLevel: "Entry-Level",
      employmentType: "Contract",
      description: "Create visually stunning designs for marketing materials, social media, and brand identity projects.",
      requirements: "Adobe Creative Suite, Figma, typography, color theory",
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Business Analyst",
      companyName: "Standard Bank",
      location: "Johannesburg, South Africa",
      country: "South Africa",
      workMode: "Hybrid",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Analyze business processes and provide data-driven insights to improve operational efficiency.",
      requirements: "Business analysis, Excel, SQL, process modeling",
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Content Writer",
      companyName: "TechCabal",
      location: "Lagos, Nigeria",
      country: "Nigeria",
      workMode: "Remote",
      seniorityLevel: "Entry-Level",
      employmentType: "Full-time",
      description: "Write engaging tech news articles, features, and opinion pieces for Africa's leading tech publication.",
      requirements: "Content writing, research, SEO, social media",
      postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Quality Assurance Engineer",
      companyName: "Uber Africa",
      location: "Johannesburg, South Africa",
      country: "South Africa",
      workMode: "Hybrid",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Ensure the quality and reliability of our ride-sharing platform across African markets.",
      requirements: "Selenium, JIRA, testing frameworks, API testing",
      postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "HR Specialist",
      companyName: "Ghana Revenue Authority",
      location: "Accra, Ghana",
      country: "Ghana",
      workMode: "On-site",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Handle recruitment, employee relations, and HR operations for government revenue collection.",
      requirements: "HR management, labor laws, MS Office, communication",
      postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Cloud Solutions Architect",
      companyName: "Microsoft Africa",
      location: "Johannesburg, South Africa",
      country: "South Africa",
      workMode: "Hybrid",
      seniorityLevel: "Senior",
      employmentType: "Full-time",
      description: "Design and implement cloud solutions for enterprise clients migrating to Microsoft Azure.",
      requirements: "Azure, cloud architecture, networking, security",
      postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Sales Representative",
      companyName: "Zipline",
      location: "Kigali, Rwanda",
      country: "Rwanda",
      workMode: "Field",
      seniorityLevel: "Entry-Level",
      employmentType: "Full-time",
      description: "Promote and sell medical drone delivery services to healthcare facilities across Rwanda.",
      requirements: "Sales, relationship building, presentations",
      postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Cybersecurity Analyst",
      companyName: "Ghana Cyber Security Authority",
      location: "Accra, Ghana",
      country: "Ghana",
      workMode: "On-site",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Monitor and respond to cyber threats, conduct security audits, and implement protective measures.",
      requirements: "Security tools, incident response, SIEM, networking",
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Electrical Engineer",
      companyName: "Kenya Power",
      location: "Nairobi, Kenya",
      country: "Kenya",
      workMode: "On-site",
      seniorityLevel: "Mid-Level",
      employmentType: "Full-time",
      description: "Design, maintain, and improve electrical distribution systems serving millions of Kenyan households.",
      requirements: "Electrical systems, AutoCAD, power distribution",
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

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

  return jobs.map((job, index) => ({
    ...job,
    id: `sample-${index + 1}`,
    isSaved: savedJobIds.includes(`sample-${index + 1}`),
    applicationUrl: `https://example.com/apply/${index + 1}`,
    source: "sample",
  }));
}
