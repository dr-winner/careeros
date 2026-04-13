import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { isUserPremium } from "@/lib/auth";

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
    let cvOptimization: {
      content: string[];
      format: string[];
      atsTips: string[];
      keywordsToAdd: string[];
      phrasesToUse: string[];
    } | null = null;

    const hasAI = hasAiProviderConfigured();
    const isPremium = await isUserPremium();

    if (missing.length > 0 && hasAI && isPremium) {
      try {
        const prompt = `You are an expert CV optimization specialist helping someone tailor their resume for a specific job. Return a JSON object with specific, actionable advice.

JOB TITLE: ${jobTitle || "This position"}
JOB REQUIREMENTS: ${(jobDescription || "").substring(0, 2000)}

CANDIDATE PROFILE:
- Headline: ${user?.headline || "Not set"}
- Experience Level: ${user?.experience || "Not provided"}
- Current Skills: ${allUserSkills.join(", ") || "Limited skills detected"}
- Work History: ${
          experiences
            .map(
              (experience) =>
                `${experience.title} at ${experience.company || "Unknown Company"}${experience.description ? ": " + experience.description.substring(0, 100) : ""}`,
            )
            .join(" | ") || "Not provided"
        }
- Education: ${
          education
            .map(
              (entry) =>
                `${entry.degree || "Degree"}${entry.fieldOfStudy ? " in " + entry.fieldOfStudy : ""} from ${entry.institution || "Unknown Institution"}`,
            )
            .join(" | ") || "Not provided"
        }

MISSING SKILLS: ${missing.join(", ")}

Return a JSON object with this exact structure (no markdown, just the JSON):
{
  "content": ["Actionable content changes - what to add/rewrite in each section"],
  "format": ["Formatting recommendations - section order, length, visual structure"],
  "atsTips": ["ATS optimization tips - keywords, structure, common pitfalls to avoid"],
  "keywordsToAdd": ["Specific keywords to add to skills section"],
  "phrasesToUse": ["Power phrases to use in work experience descriptions"]
}

Make suggestions specific to African job market. Prioritize the most impactful changes.`;

        const systemPrompt =
          "You are an expert CV optimization specialist. Return ONLY valid JSON with no additional text.";

        const { text } = await generateWithFallback(prompt, systemPrompt, {
          maxTokens: 600,
          temperature: 0.4,
        });

        // Try to parse JSON from response
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            cvOptimization = {
              content: parsed.content || [],
              format: parsed.format || [],
              atsTips: parsed.atsTips || [],
              keywordsToAdd: parsed.keywordsToAdd || [],
              phrasesToUse: parsed.phrasesToUse || [],
            };
            cvAdvice = parsed.content?.slice(0, 2).join(" ") || "";
          }
        } catch {
          // Fallback to plain text advice
          cvAdvice = text.substring(0, 300);
        }
      } catch (error) {
        console.error("AI CV optimization error:", error);
        cvAdvice = "";
      }
    }

    // Fallback advice if no AI
    if (!cvAdvice && missing.length > 0) {
      cvAdvice = `Skills to add: ${missing.slice(0, 5).join(", ")}`;
      cvOptimization = {
        content: [
          `Add these skills to your CV: ${missing.slice(0, 5).join(", ")}`,
          "Quantify achievements where possible (e.g., 'Increased sales by 30%')",
          "Mirror the exact wording from the job description",
        ],
        format: [
          "Keep CV to 1-2 pages maximum",
          "Place most relevant experience at the top",
          "Use consistent formatting throughout",
        ],
        atsTips: [
          "Include keywords from the job posting verbatim",
          "Avoid tables, headers, and complex formatting",
          "Save as Word or PDF format",
        ],
        keywordsToAdd: missing.slice(0, 5),
        phrasesToUse: [
          "Led the implementation of...",
          "Achieved measurable results in...",
          "Collaborated with cross-functional teams...",
        ],
      };
    }

    return NextResponse.json({
      analysis: {
        fitScore: score,
        matchedSkills: matched,
        missingSkills: missing,
        verdict,
        hasResume: !!user?.resumes[0],
        hasProfile: !!user?.headline || !!user?.experience,
        cvAdvice: cvAdvice || (missing.length > 0 ? "Upgrade to Premium for AI-powered CV optimization" : ""),
        cvOptimization: isPremium ? cvOptimization : null,
        aiEnabled: hasAI,
        isPremium,
        premiumRequired: !isPremium && missing.length > 0,
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
