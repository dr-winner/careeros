export type CvTipPriority = "high" | "medium" | "low";

export type CvTip = {
  category: string;
  issue: string;
  suggestion: string;
  priority: CvTipPriority;
};

export type CvForScore = {
  originalName?: string | null;
  parsedText?: string | null;
  skills: { skillName: string }[];
  experiences: { title: string; company?: string | null }[];
  education: { institution: string; degree?: string | null }[];
};

const ROLE_STOPWORDS = new Set([
  "engineer",
  "engineering",
  "developer",
  "and",
  "the",
  "of",
  "a",
  "an",
  "senior",
  "junior",
  "lead",
  "manager",
  "specialist",
  "officer",
]);

const FILENAME_TRACKS: { id: string; label: string; needles: string[] }[] = [
  { id: "fullstack", label: "Full Stack", needles: ["fullstack", "full-stack", "full_stack"] },
  { id: "frontend", label: "Frontend", needles: ["frontend", "front-end", "front_end"] },
  { id: "backend", label: "Backend", needles: ["backend", "back-end", "back_end"] },
  { id: "data", label: "Data", needles: ["data_scientist", "data-scientist", "data scientist", "data_analyst"] },
  { id: "mobile", label: "Mobile", needles: ["android", "ios_developer", "mobile_developer"] },
  { id: "security", label: "Security", needles: ["security", "cyber", "soc"] },
  { id: "devops", label: "DevOps", needles: ["devops", "sre", "site_reliability"] },
];

function normalizeTrackHaystack(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function detectCareerTrack(text: string): { id: string; label: string } | null {
  const hay = normalizeTrackHaystack(text);
  const lower = text.toLowerCase();
  for (const t of FILENAME_TRACKS) {
    if (t.needles.some((n) => hay.includes(n.replace(/-/g, "_")) || lower.includes(n))) {
      return { id: t.id, label: t.label };
    }
  }
  return null;
}

export function targetRoleTokens(role: string): string[] {
  return role
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !ROLE_STOPWORDS.has(t));
}

export function analyzeCvQuality(
  cv: CvForScore | null,
  targetRole?: string | null,
  headline?: string | null,
): CvTip[] {
  if (!cv) return [];

  const tips: CvTip[] = [];
  if (!cv.parsedText || cv.parsedText.length < 200) {
    tips.push({
      category: "Content",
      issue: "Limited CV content",
      suggestion: "Add more details about your experience and achievements.",
      priority: "high",
    });
  }
  if (cv.skills.length < 5) {
    tips.push({
      category: "Skills",
      issue: "Fewer than 5 skills listed",
      suggestion: "Add more relevant technical and soft skills.",
      priority: "high",
    });
  }
  if (cv.experiences.length < 2) {
    tips.push({
      category: "Experience",
      issue: "Limited work experience",
      suggestion: "Include all relevant positions, even internships.",
      priority: "medium",
    });
  }
  if (cv.education.length === 0) {
    tips.push({
      category: "Education",
      issue: "No education entries",
      suggestion: "Add your educational background and certifications.",
      priority: "high",
    });
  }
  if (!/^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(cv.parsedText || "")) {
    tips.push({
      category: "Writing",
      issue: "Use stronger action verbs",
      suggestion: "Start bullets with verbs like Led, Built, Increased.",
      priority: "low",
    });
  }

  const target = (targetRole || "").trim();
  if (target) {
    const corpus = [
      cv.originalName,
      cv.parsedText,
      ...cv.skills.map((s) => s.skillName),
      ...cv.experiences.map((e) => e.title),
    ]
      .join(" ")
      .toLowerCase();
    const tokens = targetRoleTokens(target);
    const hits = tokens.filter((t) => corpus.includes(t));
    const fileTrack = detectCareerTrack(cv.originalName || "");
    const targetTrack = detectCareerTrack(`${target} ${headline || ""}`);

    if (fileTrack && targetTrack && fileTrack.id !== targetTrack.id) {
      tips.push({
        category: "Target role",
        issue: `This file is named for ${fileTrack.label} while you are targeting ${target}`,
        suggestion: `Lead the version you send with ${target} work, or upload a CV named for that role. A complete CV is not the same as a fit score.`,
        priority: "high",
      });
    } else if (tokens.length > 0 && hits.length === 0) {
      tips.push({
        category: "Target role",
        issue: `Little overlap with your target role (${target})`,
        suggestion: `Mention ${target} skills and titles in the summary you send.`,
        priority: "medium",
      });
    }
  }

  if (!tips.length) {
    tips.push({
      category: "Overall",
      issue: "Looking great!",
      suggestion: "Your CV is well-structured.",
      priority: "low",
    });
  }
  return tips;
}

export function scoreCvFromTips(tips: CvTip[]): number {
  return Math.max(
    0,
    100 -
      tips.filter((s) => s.priority === "high").length * 20 -
      tips.filter((s) => s.priority === "medium").length * 10 -
      tips.filter((s) => s.priority === "low").length * 5,
  );
}

export function hasRoleGap(tips: CvTip[]): boolean {
  return tips.some((t) => t.category === "Target role");
}

export function cvScoreLabel(score: number, roleGap: boolean): string {
  if (roleGap && score >= 60) return "Complete · off-target";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}
