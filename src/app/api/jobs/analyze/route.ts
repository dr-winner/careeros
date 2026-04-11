import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";

const SKILL_KEYWORDS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "ecmascript", "jscript"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "reactjs", "react.js", "nextjs", "next.js"],
  Vue: ["vue", "vuejs", "vue.js", "nuxt"],
  Angular: ["angular", "angularjs"],
  "Node.js": ["node", "nodejs", "node.js", "express", "expressjs"],
  Python: ["python", "django", "flask", "fastapi", "pandas", "numpy"],
  Java: ["java", "spring", "springboot", "spring boot", "jvm"],
  "C#": ["c#", "csharp", ".net", "dotnet", "asp.net"],
  PHP: ["php", "laravel", "codeigniter", "wordpress"],
  Ruby: ["ruby", "ruby on rails", "rails"],
  Go: ["golang", "go programming"],
  Rust: ["rust", "rustlang"],
  Swift: ["swift", "ios", "swiftui"],
  Kotlin: ["kotlin", "android"],
  Flutter: ["flutter", "dart"],
  "React Native": ["react native", "rn"],
  SQL: [
    "sql",
    "mysql",
    "postgresql",
    "postgres",
    "sqlite",
    "mssql",
    "database",
  ],
  MongoDB: ["mongodb", "mongo", "nosql"],
  Redis: ["redis", "cache"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda", "cloudformation"],
  Azure: ["azure", "microsoft azure", "azure devops"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker", "container", "containerization"],
  Kubernetes: ["kubernetes", "k8s", "helm"],
  "CI/CD": ["ci/cd", "jenkins", "gitlab ci", "github actions", "pipeline"],
  Git: ["git", "github", "gitlab", "bitbucket", "version control"],
  Linux: ["linux", "unix", "bash", "shell"],
  "Machine Learning": [
    "machine learning",
    "ml",
    "ai",
    "tensorflow",
    "pytorch",
    "keras",
  ],
  "Data Analysis": ["data analysis", "analytics", "tableau", "power bi"],
  Agile: ["agile", "scrum", "kanban", "jira"],
  Leadership: ["leadership", "team lead", "mentoring", "management"],
  Communication: ["communication", "stakeholder", "presentation"],
  "Project Management": ["project management", "pmp"],
  Marketing: ["marketing", "seo", "sem", "digital marketing"],
  Sales: ["sales", "crm", "salesforce", "business development"],
  Finance: ["finance", "accounting", "financial analysis"],
  Accounting: ["accounting", "bookkeeping", "tax", "auditing"],
  HR: ["hr", "human resources", "recruitment"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "figma"],
  "UI/UX": ["ui/ux", "ui design", "ux design", "user experience"],
  Networking: ["networking", "cisco", "ccna", "network security"],
  Cybersecurity: ["cybersecurity", "security", "penetration testing"],
  API: ["api", "rest api", "restful", "graphql"],
  Testing: ["testing", "qa", "selenium", "jest", "unit test"],
  Microservices: ["microservices", "service mesh"],
  Cloud: ["cloud", "cloud computing", "serverless"],
};

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills: string[] = [];

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      foundSkills.push(skill);
    }
  }

  return foundSkills;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobDescription, jobTitle } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          where: { isPrimary: true },
          take: 1,
          include: {
            skills: true,
            experiences: true,
            education: true,
          },
        },
      },
    });

    const profileSkills = extractSkills(
      [
        user?.headline || "",
        user?.experience || "",
        user?.desiredRole || "",
      ].join(" "),
    );

    const resumeSkills =
      user?.resumes[0]?.skills?.map(
        (skill: { skillName: string }) => skill.skillName,
      ) || [];

    const experiences = user?.resumes[0]?.experiences || [];
    const education = user?.resumes[0]?.education || [];

    const allUserSkills = [...new Set([...profileSkills, ...resumeSkills])];
    const jobSkills = extractSkills(jobDescription || "");

    const matched = allUserSkills.filter((skill) =>
      jobSkills.some(
        (jobSkill) =>
          jobSkill.toLowerCase() === skill.toLowerCase() ||
          skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
          jobSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    );

    const missing = jobSkills.filter(
      (skill) =>
        !matched.some((match) => match.toLowerCase() === skill.toLowerCase()),
    );

    const score =
      jobSkills.length > 0
        ? Math.round((matched.length / jobSkills.length) * 100)
        : 50;

    let verdict: string;
    if (score >= 80) verdict = "Strong Match";
    else if (score >= 60) verdict = "Good Fit";
    else if (score >= 40) verdict = "Partial Match";
    else verdict = "Reach Position";

    let cvAdvice = "";
    const hasAI = hasAiProviderConfigured();

    if (missing.length > 0 && hasAI) {
      try {
        const prompt = `You are a career coach helping someone optimize their CV for a specific job.

JOB TITLE: ${jobTitle || "This position"}
JOB REQUIREMENTS: ${(jobDescription || "").substring(0, 2000)}

CANDIDATE'S CURRENT CV HIGHLIGHTS:
- Headline: ${user?.headline || "Not set"}
- Experience: ${user?.experience || "Not provided"}
- Skills found in CV: ${allUserSkills.join(", ") || "Limited skills detected"}
- Work History: ${
          experiences
            .map(
              (experience) =>
                `${experience.title} at ${experience.company || "Unknown Company"}`,
            )
            .join("; ") || "Not provided"
        }
- Education: ${
          education
            .map(
              (entry) =>
                `${entry.degree || "Degree"} in ${entry.fieldOfStudy || "Field"}`,
            )
            .join("; ") || "Not provided"
        }

MISSING SKILLS FOR THIS JOB: ${missing.join(", ")}

Generate 3-4 specific, actionable suggestions for how this candidate can UPDATE THEIR CV to better match this job. Focus on:
1. Keywords to add to their skills section
2. Phrases to include in their work experience descriptions
3. Specific achievements they could highlight
4. Any certifications or quick wins to mention

Keep suggestions practical and specific to African job market context. Max 150 words.`;

        const systemPrompt =
          "You are a professional career coach specializing in helping African job seekers. Give practical, actionable CV advice.";

        const { text } = await generateWithFallback(prompt, systemPrompt, {
          maxTokens: 300,
          temperature: 0.5,
        });

        cvAdvice = text;
      } catch (error) {
        console.error("AI CV advice error:", error);
        cvAdvice = "";
      }
    }

    if (!cvAdvice && missing.length > 0) {
      cvAdvice = `Skills to add to your CV: ${missing.slice(0, 5).join(", ")}`;
    }

    return NextResponse.json({
      analysis: {
        fitScore: score,
        matchedSkills: matched,
        missingSkills: missing,
        verdict,
        hasResume: !!user?.resumes[0],
        hasProfile: !!user?.headline || !!user?.experience,
        cvAdvice,
        aiEnabled: hasAI,
      },
    });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    return NextResponse.json(
      { error: "Failed to analyze job fit" },
      { status: 500 },
    );
  }
}
