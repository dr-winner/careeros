import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

const SKILL_KEYWORDS: Record<string, string[]> = {
  "JavaScript": ["javascript", "js", "ecmascript", "jscript"],
  "TypeScript": ["typescript", "ts"],
  "React": ["react", "reactjs", "react.js", "nextjs", "next.js"],
  "Vue": ["vue", "vuejs", "vue.js", "nuxt"],
  "Angular": ["angular", "angularjs"],
  "Node.js": ["node", "nodejs", "node.js", "express", "expressjs"],
  "Python": ["python", "django", "flask", "fastapi", "pandas", "numpy"],
  "Java": ["java", "spring", "springboot", "spring boot", "jvm"],
  "C#": ["c#", "csharp", ".net", "dotnet", "asp.net"],
  "PHP": ["php", "laravel", "codeigniter", "wordpress"],
  "Ruby": ["ruby", "ruby on rails", "rails"],
  "Go": ["golang", "go programming"],
  "Rust": ["rust", "rustlang"],
  "Swift": ["swift", "ios", "swiftui"],
  "Kotlin": ["kotlin", "android"],
  "Flutter": ["flutter", "dart"],
  "React Native": ["react native", "rn"],
  "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "database"],
  "MongoDB": ["mongodb", "mongo", "nosql"],
  "Redis": ["redis", "cache"],
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "cloudformation"],
  "Azure": ["azure", "microsoft azure", "azure devops"],
  "GCP": ["gcp", "google cloud", "google cloud platform"],
  "Docker": ["docker", "container", "containerization"],
  "Kubernetes": ["kubernetes", "k8s", "helm"],
  "CI/CD": ["ci/cd", "jenkins", "gitlab ci", "github actions", "pipeline"],
  "Git": ["git", "github", "gitlab", "bitbucket", "version control"],
  "Linux": ["linux", "unix", "bash", "shell"],
  "Data Analysis": ["data analysis", "analytics", "tableau", "power bi", "looker"],
  "Machine Learning": ["machine learning", "ml", "ai", "tensorflow", "pytorch", "keras"],
  "Deep Learning": ["deep learning", "neural network", "cnn", "rnn"],
  "DevOps": ["devops", "sre", "site reliability"],
  "Agile": ["agile", "scrum", "kanban", "jira"],
  "Project Management": ["project management", "pmp", "prince2"],
  "Communication": ["communication", "stakeholder", "presentation", "public speaking"],
  "Leadership": ["leadership", "team lead", "mentoring", "management"],
  "Marketing": ["marketing", "seo", "sem", "digital marketing", "content"],
  "Sales": ["sales", "crm", "salesforce", "business development"],
  "Finance": ["finance", "accounting", "financial analysis", "excel"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "figma", "canva"],
  "UI/UX": ["ui/ux", "ui design", "ux design", "user experience", "user interface"],
  "Accounting": ["accounting", "bookkeeping", "tax", "auditing"],
  "HR": ["hr", "human resources", "recruitment", "talent acquisition"],
  "Networking": ["networking", "cisco", "ccna", "network security", "firewall"],
  "Cybersecurity": ["cybersecurity", "security", "penetration testing", "ethical hacking"],
  "Cloud": ["cloud", "cloud computing", "serverless"],
  "API": ["api", "rest api", "restful", "graphql", "grpc"],
  "Microservices": ["microservices", "microservice", "service mesh"],
  "Testing": ["testing", "qa", "quality assurance", "selenium", "jest", "unit test"],
};

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills: string[] = [];

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      foundSkills.push(skill);
    }
  }

  return foundSkills;
}

function calculateFitScore(userSkills: string[], jobDescription: string): {
  score: number;
  matched: string[];
  missing: string[];
  confidence: "high" | "medium" | "low";
} {
  const jobSkills = extractSkills(jobDescription);
  
  if (jobSkills.length === 0) {
    return { score: 50, matched: [], missing: [], confidence: "low" };
  }
  
  const matched = userSkills.filter(skill =>
    jobSkills.some(jobSkill =>
      jobSkill.toLowerCase() === skill.toLowerCase() ||
      skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );

  const missing = jobSkills.filter(skill =>
    !matched.some(m => m.toLowerCase() === skill.toLowerCase())
  );

  const score = Math.round((matched.length / jobSkills.length) * 100);
  
  const confidence = jobSkills.length >= 5 ? "high" : jobSkills.length >= 3 ? "medium" : "low";

  return { score, matched, missing, confidence };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobDescription } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          where: { isPrimary: true },
          take: 1,
          include: { skills: true },
        },
      },
    });

    const userSkills: string[] = [];
    
    if (user?.headline) {
      userSkills.push(...extractSkills(user.headline));
    }
    if (user?.experience) {
      userSkills.push(...extractSkills(user.experience));
    }
    if (user?.desiredRole) {
      userSkills.push(...extractSkills(user.desiredRole));
    }
    if (user?.resumes[0]?.skills) {
      userSkills.push(...user.resumes[0].skills.map((s: { skillName: string }) => s.skillName));
    }
    
    const uniqueSkills = [...new Set(userSkills)];

    const jobDesc = jobDescription || "";
    const { score, matched, missing, confidence } = calculateFitScore(uniqueSkills, jobDesc);

    let verdict: string;
    if (score >= 80) verdict = "Strong Match";
    else if (score >= 60) verdict = "Good Fit";
    else if (score >= 40) verdict = "Partial Match";
    else verdict = "Reach Position";

    return NextResponse.json({
      analysis: {
        fitScore: score,
        matchedSkills: matched,
        missingSkills: missing,
        verdict,
        confidence,
      }
    });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    return NextResponse.json(
      { error: "Failed to analyze job fit" },
      { status: 500 }
    );
  }
}
