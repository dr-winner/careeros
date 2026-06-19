import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { isUserPremium } from "@/lib/auth";

const SKILL_KEYWORDS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "ecmascript"],
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
  SQL: ["sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "database"],
  MongoDB: ["mongodb", "mongo", "nosql"],
  Redis: ["redis", "cache"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  Azure: ["azure", "microsoft azure", "azure devops"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker", "container", "containerization"],
  Kubernetes: ["kubernetes", "k8s", "helm"],
  "CI/CD": ["ci/cd", "jenkins", "gitlab ci", "github actions", "pipeline"],
  Git: ["git", "github", "gitlab", "bitbucket", "version control"],
  Linux: ["linux", "unix", "bash", "shell"],
  "Machine Learning": ["machine learning", "ml", "tensorflow", "pytorch", "keras"],
  "Data Analysis": ["data analysis", "analytics", "tableau", "power bi"],
  Agile: ["agile", "scrum", "kanban", "jira"],
  Leadership: ["leadership", "team lead", "mentoring", "management"],
  Communication: ["communication", "stakeholder", "presentation"],
  "Project Management": ["project management", "pmp"],
  Marketing: ["marketing", "seo", "sem", "digital marketing"],
  Sales: ["sales", "crm", "salesforce", "business development"],
  Finance: ["finance", "accounting", "financial analysis"],
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
    if (keywords.some((kw) => lowerText.includes(kw))) {
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
          include: { skills: true, experiences: true, education: true },
        },
      },
    });

    const profileSkills = extractSkills(
      [user?.headline || "", user?.experience || "", user?.desiredRole || ""].join(" "),
    );
    const resumeSkills =
      user?.resumes[0]?.skills?.map((s: { skillName: string }) => s.skillName) || [];
    const experiences = user?.resumes[0]?.experiences || [];
    const education = user?.resumes[0]?.education || [];
    const allUserSkills = [...new Set([...profileSkills, ...resumeSkills])];
    const jobSkills = extractSkills(jobDescription || "");

    const matched = allUserSkills.filter((skill) =>
      jobSkills.some(
        (j) =>
          j.toLowerCase() === skill.toLowerCase() ||
          skill.toLowerCase().includes(j.toLowerCase()) ||
          j.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
    const missing = jobSkills.filter(
      (j) => !matched.some((m) => m.toLowerCase() === j.toLowerCase()),
    );

    const score =
      jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 50;

    let verdict: string;
    if (score >= 80) verdict = "Strong Match";
    else if (score >= 60) verdict = "Good Fit";
    else if (score >= 40) verdict = "Partial Match";
    else verdict = "Reach Position";

    const hasAI = hasAiProviderConfigured();
    const isPremium = await isUserPremium();

    let cvAdvice = "";
    let cvOptimization: {
      content: string[];
      format: string[];
      atsTips: string[];
      keywordsToAdd: string[];
      phrasesToUse: string[];
    } | null = null;
    let aiNarrative: { strengths: string; gaps: string; recommendation: string } | null = null;

    const profileIncomplete = allUserSkills.length === 0 && !user?.headline && !user?.experience;

    if (hasAI && jobDescription && !profileIncomplete) {
      // AI narrative analysis for ALL users — brief summary of fit
      try {
        const narrativePrompt = `You are a career advisor speaking directly to a job seeker. Analyze their fit for this role and speak in second person ("you", "your").

JOB: ${jobTitle || "Position"}
JOB DESCRIPTION (first 3000 chars): ${(jobDescription || "").substring(0, 3000)}

ABOUT THE USER:
- Skills: ${allUserSkills.join(", ") || "None listed"}
- Experience level: ${user?.experience || "Not specified"}
- Headline: ${user?.headline || "Not set"}
- Matched skills: ${matched.join(", ") || "None"}
- Missing skills: ${missing.join(", ") || "None"}

Return ONLY this JSON (no markdown). Use "you"/"your" throughout, never "the candidate":
{
  "strengths": "1-2 sentences on your strengths for this role",
  "gaps": "1-2 sentences on key gaps you should address",
  "recommendation": "direct 1-sentence recommendation on whether you should apply"
}`;

        const { text } = await generateWithFallback(
          narrativePrompt,
          "You are a career advisor speaking directly to a job seeker. Always use second person (you/your). Return only valid JSON, no markdown.",
          { maxTokens: 300, temperature: 0.3 },
        );
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiNarrative = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.error("AI narrative error:", err);
      }

      // AI CV optimization — premium only
      if (isPremium && missing.length > 0) {
        try {
          const optimizePrompt = `You are an expert CV optimization specialist for the African job market. Speak directly to the user using "you"/"your".

JOB TITLE: ${jobTitle || "This position"}
JOB DESCRIPTION: ${(jobDescription || "").substring(0, 2000)}

ABOUT THE USER:
- Headline: ${user?.headline || "Not set"}
- Experience: ${user?.experience || "Not provided"}
- Skills: ${allUserSkills.join(", ") || "None"}
- Work history: ${experiences.map((e: { title: string; company: string | null }) => `${e.title}${e.company ? " at " + e.company : ""}`).join(", ") || "Not provided"}
- Education: ${education.map((e: { degree: string | null; institution: string }) => `${e.degree || "Degree"} from ${e.institution}`).join(", ") || "Not provided"}
- Missing skills: ${missing.join(", ")}

Return ONLY this JSON (no markdown):
{
  "content": ["specific content change 1", "specific content change 2"],
  "format": ["formatting tip 1", "formatting tip 2"],
  "atsTips": ["ATS tip 1", "ATS tip 2"],
  "keywordsToAdd": ["keyword1", "keyword2"],
  "phrasesToUse": ["power phrase 1", "power phrase 2"]
}`;

          const { text } = await generateWithFallback(
            optimizePrompt,
            "You are an expert CV optimizer. Return ONLY valid JSON.",
            { maxTokens: 600, temperature: 0.4 },
          );
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
            cvAdvice = parsed.content?.[0] || "";
          }
        } catch (err) {
          console.error("AI CV optimization error:", err);
        }
      }
    }

    // Non-AI fallback advice
    if (!cvAdvice && missing.length > 0) {
      cvAdvice = `Skills to develop: ${missing.slice(0, 5).join(", ")}`;
      if (!isPremium) {
        cvOptimization = null;
      }
    }

    return NextResponse.json({
      analysis: {
        fitScore: score,
        matchedSkills: matched,
        missingSkills: missing,
        verdict,
        hasResume: !!user?.resumes[0],
        hasProfile: !!(user?.headline || user?.experience),
        cvAdvice,
        cvOptimization: isPremium ? cvOptimization : null,
        aiNarrative,
        aiEnabled: hasAI,
        isPremium,
        premiumRequired: !isPremium && missing.length > 0,
        profileIncomplete,
      },
    });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    return NextResponse.json({ error: "Failed to analyze job fit" }, { status: 500 });
  }
}
