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

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted?: string;
  salary?: string;
}

async function scrapeJobbermanGhana(query: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    const searchQuery = encodeURIComponent(query || "software");
    const url = `https://www.jobberman.com.gh/jobs?q=${searchQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CareerOS/1.0; +https://careeros.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.log("Jobberman Ghana: HTTP", response.status);
      return jobs;
    }
    
    const html = await response.text();
    
    const titles = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/h[23]>/gi)].map(m => m[1].trim());
    const companies = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const locations = [...html.matchAll(/class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const links = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>[\s\n]*<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
    
    for (let i = 0; i < Math.min(titles.length, 20); i++) {
      jobs.push({
        title: titles[i] || "Unknown Position",
        company: companies[i] || "Unknown Company",
        location: locations[i] || "Ghana",
        description: "",
        url: links[i]?.startsWith("http") ? links[i] : `https://www.jobberman.com.gh${links[i] || ""}`,
        posted: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.log("Jobberman Ghana error:", error);
  }
  
  return jobs;
}

async function scrapeBrightermondayKenya(query: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    const searchQuery = encodeURIComponent(query || "software");
    const url = `https://www.brightermonday.co.ke/jobs?search=${searchQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CareerOS/1.0; +https://careeros.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.log("Brightermonday Kenya: HTTP", response.status);
      return jobs;
    }
    
    const html = await response.text();
    
    const titles = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/h[23]>/gi)].map(m => m[1].trim());
    const companies = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const locations = [...html.matchAll(/class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const links = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>[\s\n]*<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
    
    for (let i = 0; i < Math.min(titles.length, 20); i++) {
      jobs.push({
        title: titles[i] || "Unknown Position",
        company: companies[i] || "Unknown Company",
        location: locations[i] || "Kenya",
        description: "",
        url: links[i]?.startsWith("http") ? links[i] : `https://www.brightermonday.co.ke${links[i] || ""}`,
        posted: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.log("Brightermonday Kenya error:", error);
  }
  
  return jobs;
}

async function scrapeMyJobMagNigeria(query: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    const searchQuery = encodeURIComponent(query || "software");
    const url = `https://www.myjobmag.com/search?q=${searchQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CareerOS/1.0; +https://careeros.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.log("MyJobMag Nigeria: HTTP", response.status);
      return jobs;
    }
    
    const html = await response.text();
    
    const titles = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>[\s\n]*<a[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
    const companies = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>[\s\n]*<a[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
    const locations = [...html.matchAll(/class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const links = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>[\s\n]*<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
    
    for (let i = 0; i < Math.min(titles.length, 20); i++) {
      jobs.push({
        title: titles[i] || "Unknown Position",
        company: companies[i] || "Unknown Company",
        location: locations[i] || "Nigeria",
        description: "",
        url: links[i]?.startsWith("http") ? links[i] : `https://www.myjobmag.com${links[i] || ""}`,
        posted: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.log("MyJobMag Nigeria error:", error);
  }
  
  return jobs;
}

async function scrapeJobbermanNigeria(query: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    const searchQuery = encodeURIComponent(query || "software");
    const url = `https://www.jobberman.com/jobs?q=${searchQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CareerOS/1.0; +https://careeros.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.log("Jobberman Nigeria: HTTP", response.status);
      return jobs;
    }
    
    const html = await response.text();
    
    const titles = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/h[23]>/gi)].map(m => m[1].trim());
    const companies = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const locations = [...html.matchAll(/class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
    const links = [...html.matchAll(/class="[^"]*job-title[^"]*"[^>]*>[\s\n]*<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
    
    for (let i = 0; i < Math.min(titles.length, 20); i++) {
      jobs.push({
        title: titles[i] || "Unknown Position",
        company: companies[i] || "Unknown Company",
        location: locations[i] || "Nigeria",
        description: "",
        url: links[i]?.startsWith("http") ? links[i] : `https://www.jobberman.com${links[i] || ""}`,
        posted: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.log("Jobberman Nigeria error:", error);
  }
  
  return jobs;
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

function formatScrapedJob(raw: ScrapedJob, source: string, savedJobIds: string[]): Job {
  return {
    id: `scraped-${source}-${Buffer.from(raw.url).toString('base64').slice(0, 20)}`,
    title: raw.title,
    companyName: raw.company,
    location: raw.location,
    country: getCountry(source),
    workMode: "Not specified",
    seniorityLevel: detectSeniority(raw.title),
    employmentType: "Full-time",
    description: raw.description || "Click to view full details.",
    requirements: "See job posting for details",
    postedAt: raw.posted || new Date().toISOString(),
    isSaved: savedJobIds.includes(`scraped-${source}-${Buffer.from(raw.url).toString('base64').slice(0, 20)}`),
    applicationUrl: raw.url,
    source: `scraped-${source}`,
  };
}

function getCountry(source: string): string {
  const sources: Record<string, string> = {
    'jobberman-ghana': 'GH',
    'jobberman-nigeria': 'NG',
    'brightermonday': 'KE',
    'myjobmag': 'NG',
  };
  return sources[source] || 'AFRICA';
}

export async function scrapeAfricanJobs(query: string, savedJobIds: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  
  await Promise.all([
    scrapeJobbermanGhana(query).then(jobs => {
      jobs.forEach(j => allJobs.push(formatScrapedJob(j, 'jobberman-ghana', savedJobIds)));
    }),
    scrapeJobbermanNigeria(query).then(jobs => {
      jobs.forEach(j => allJobs.push(formatScrapedJob(j, 'jobberman-nigeria', savedJobIds)));
    }),
    scrapeBrightermondayKenya(query).then(jobs => {
      jobs.forEach(j => allJobs.push(formatScrapedJob(j, 'brightermonday', savedJobIds)));
    }),
    scrapeMyJobMagNigeria(query).then(jobs => {
      jobs.forEach(j => allJobs.push(formatScrapedJob(j, 'myjobmag', savedJobIds)));
    }),
  ]);
  
  return allJobs;
}

export async function scrapeJobsForAPI(query: string): Promise<Job[]> {
  return scrapeAfricanJobs(query, []);
}
