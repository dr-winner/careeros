import { describe, expect, it } from "vitest";
import {
  analyzeCvQuality,
  cvScoreLabel,
  detectCareerTrack,
  hasRoleGap,
  scoreCvFromTips,
} from "./cv-score";

const fullstackCloudCv = {
  originalName: "Richard_Winner_Duvor_FullStack_Engineer_cv.pdf",
  parsedText:
    "Led teams building responsive interfaces using HTML and React. Work with PHP, JavaScript, AWS, Azure, Cloud Security and Cybersecurity across multiple products in Ghana and remote. Implemented IAM reviews, threat modelling, and documented incident response for production systems.",
  skills: [
    { skillName: "JavaScript" },
    { skillName: "React" },
    { skillName: "Python" },
    { skillName: "AWS" },
    { skillName: "Azure" },
    { skillName: "Cloud Security" },
    { skillName: "Cybersecurity" },
  ],
  experiences: [
    { title: "Full Stack Engineer", company: "Example" },
    { title: "Software Developer", company: "Example" },
  ],
  education: [{ institution: "University of Ghana", degree: "BSc" }],
};

describe("cv-score", () => {
  it("detects Full Stack vs Security tracks from filenames and titles", () => {
    expect(detectCareerTrack("Richard_Winner_Duvor_FullStack_Engineer_cv.pdf")?.id).toBe("fullstack");
    expect(detectCareerTrack("Cloud Security Engineer")?.id).toBe("security");
  });

  it("does not call a Full Stack file Excellent for a Cloud Security target", () => {
    const tips = analyzeCvQuality(fullstackCloudCv, "Cloud Security", "Cyber & Cloud Security Engineer");
    expect(hasRoleGap(tips)).toBe(true);
    const score = scoreCvFromTips(tips);
    expect(score).toBeLessThanOrEqual(80);
    expect(cvScoreLabel(score, true)).toBe("Complete · off-target");
    expect(tips.some((t) => t.category === "Target role" && t.priority === "high")).toBe(true);
  });

  it("stays a completeness score when the filename matches the target", () => {
    const tips = analyzeCvQuality(
      { ...fullstackCloudCv, originalName: "Duvor_Cloud_Security_Engineer.pdf" },
      "Cloud Security",
      "Cyber & Cloud Security Engineer",
    );
    expect(hasRoleGap(tips)).toBe(false);
    expect(scoreCvFromTips(tips)).toBe(95);
    expect(cvScoreLabel(95, false)).toBe("Excellent");
  });
});
