/** Shared between profile, guided onboarding, and API-related UI so saved values always match a select option. */
export const PROFILE_COUNTRIES = [
  "Ghana",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Global / Remote Only",
  "Other",
] as const;

/** Grouped role types for the profile select (renders as <optgroup>) */
export const ROLE_TYPE_GROUPS = [
  {
    group: "Software Engineering",
    roles: [
      "Software Engineer",
      "Full-stack Developer",
      "Frontend Developer",
      "Backend Developer",
      "Mobile Developer (iOS / Android / Flutter)",
      "Embedded / Systems Developer",
      "QA / Test Engineer",
    ],
  },
  {
    group: "Cloud & Infrastructure",
    roles: [
      "Cloud Engineer",
      "DevOps / Site Reliability Engineer",
      "Systems Administrator",
      "Network Engineer",
      "Database Administrator (DBA)",
    ],
  },
  {
    group: "Cybersecurity",
    roles: [
      "Cybersecurity Analyst",
      "Network Security Engineer",
      "Penetration Tester / Ethical Hacker",
      "Security Operations (SOC) Analyst",
      "Information Security Manager",
    ],
  },
  {
    group: "Data & AI",
    roles: [
      "Data Scientist",
      "Machine Learning / AI Engineer",
      "Data Analyst",
      "Data Engineer",
      "Business Intelligence (BI) Analyst",
    ],
  },
  {
    group: "Product & Design",
    roles: [
      "Product Manager",
      "UI/UX Designer",
      "Product Designer",
      "Graphic / Brand Designer",
    ],
  },
  {
    group: "Marketing & Growth",
    roles: [
      "Digital Marketer",
      "Growth / Performance Marketer",
      "Content Creator / Copywriter",
      "SEO / SEM Specialist",
      "Social Media Manager",
      "Brand Strategist",
    ],
  },
  {
    group: "Business & Sales",
    roles: [
      "Sales / Business Development",
      "Account Manager",
      "Customer Success Manager",
      "Operations Manager",
      "Project / Programme Manager",
      "Supply Chain / Logistics",
    ],
  },
  {
    group: "Finance",
    roles: [
      "Accountant / Finance Officer",
      "Financial Analyst",
      "Fintech / Payment Systems",
      "Auditor",
    ],
  },
  {
    group: "People & Support",
    roles: [
      "HR Generalist",
      "Recruiter / Talent Acquisition",
      "People Operations",
      "IT Support / Help Desk",
      "Customer Support",
    ],
  },
  {
    group: "Other",
    roles: [
      "Legal / Compliance",
      "Research / Academia",
      "Consultant",
      "Entrepreneur / Founder",
      "Other",
    ],
  },
] as const;

/** Flat list derived from groups — used for validation and backward compat */
export const ROLE_TYPES: string[] = ROLE_TYPE_GROUPS.flatMap((g) => [...g.roles]);

/**
 * Include both year ranges (profile) and level labels (onboarding) so values from either flow stay valid.
 */
export const EXPERIENCE_LEVELS = [
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
  "Entry Level",
  "Mid Level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
] as const;
