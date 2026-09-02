import { describe, expect, it } from "vitest";
import { SOFT_SKILLS, canonicalizeSkill, extractSkills, skillMentioned } from "./skills";

describe("extractSkills", () => {
  it("does not read tech skills into an accountant advert", () => {
    const skills = extractSkills(
      "Prepare management accounts, reconcile general ledger, VAT filings, IFRS reporting. " +
        "ACCA part-qualified with strong Excel. Reacting quickly to audit queries. Go-getter attitude.",
    );
    expect(skills).toContain("Accounting");
    expect(skills).toContain("Excel");
    expect(skills).not.toContain("React");
    expect(skills).not.toContain("Go");
    expect(skills).not.toContain("TypeScript");
  });

  it("does not turn 'typescripts of certificates' into TypeScript", () => {
    const skills = extractSkills(
      "IT Support Officer. Windows 10, Active Directory, Office 365. Typescripts of certificates required.",
    );
    expect(skills).toContain("IT Support");
    expect(skills).not.toContain("TypeScript");
  });

  it("separates React from React Native and Java from JavaScript", () => {
    expect(extractSkills("React Native mobile app")).toContain("React Native");
    const java = extractSkills("Java backend with Spring");
    expect(java).toContain("Java");
    expect(java).not.toContain("JavaScript");
  });

  it("does not treat 'medication administration' as office admin", () => {
    const skills = extractSkills("Registered nurse: patient care, medication administration, vital signs.");
    expect(skills).toContain("Healthcare");
    expect(skills).not.toContain("Administration");
  });

  it("flags soft skills so they can be excluded from scoring", () => {
    expect(SOFT_SKILLS.has("Communication")).toBe(true);
    expect(SOFT_SKILLS.has("Accounting")).toBe(false);
  });
});

describe("canonicalizeSkill", () => {
  it("maps raw CV parser output onto the dictionary", () => {
    expect(canonicalizeSkill("React and Next.js")).toEqual(["JavaScript", "React"]);
    expect(canonicalizeSkill("and Python")).toEqual(["Python"]);
    expect(canonicalizeSkill("Javascript")).toEqual(["JavaScript"]);
    expect(canonicalizeSkill("Ms Excel")).toEqual(["Excel"]);
  });

  it("drops emails, URLs and single letters", () => {
    expect(canonicalizeSkill("richard@example.com")).toEqual([]);
    expect(canonicalizeSkill("https://linkedin.com/in/x")).toEqual([]);
    expect(canonicalizeSkill("C")).toEqual([]);
  });
});

describe("skillMentioned", () => {
  it.each<[string, string, boolean]>([
    ["Reacting to queries", "React", false],
    ["experience with golang and rust", "Go", true],
    ["go-getter attitude", "Go", false],
    ["Google Sheets", "Go", false],
    ["We use C++ daily", "C++", true],
    ["We use C# daily", "C#", true],
    ["We use C++ daily", "C", false],
    ["Java or Kotlin", "JavaScript", false],
    ["JS heavy stack", "JavaScript", true],
    ["SQL Server DBA", "SQL", true],
  ])("%s / %s -> %s", (text, skill, expected) => {
    expect(skillMentioned(text, skill)).toBe(expected);
  });
});
