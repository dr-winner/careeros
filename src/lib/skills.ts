// Shared skill dictionary + matcher for the fit analysis and the feed
// quick-match. Pure and client-safe.
//
// Matching is whole-token: the previous implementation used raw substring
// checks, so "ts" in "accounts" became TypeScript, "rn" in "external" became
// React Native and "management" became Leadership — an Accountant advert was
// told to learn React Native. Aliases that only make sense as substrings
// have been removed, and the list now covers the non-tech roles that make up
// most of the Ghanaian market (accounting, admin, sales, teaching, NGO…).

export const SKILL_KEYWORDS: Record<string, string[]> = {
  // ── Software & data ──────────────────────────────────────────────────────
  JavaScript: ["javascript", "js", "ecmascript", "es6"],
  TypeScript: ["typescript"],
  React: ["react", "reactjs", "react.js", "nextjs", "next.js"],
  Vue: ["vue", "vuejs", "vue.js", "nuxt"],
  Angular: ["angular", "angularjs"],
  "Node.js": ["node", "nodejs", "node.js", "expressjs", "express.js"],
  Python: ["python", "django", "flask", "fastapi", "pandas", "numpy"],
  Java: ["java", "spring boot", "springboot", "jvm"],
  "C#": ["c#", "csharp", ".net", "dotnet", "asp.net"],
  PHP: ["php", "laravel", "codeigniter", "wordpress"],
  Ruby: ["ruby", "ruby on rails"],
  // Bare "go" is too common a verb ("go-getter", "go live"); require context.
  Go: ["golang", "go lang", "go developer", "go programming", "go (golang)", "go/golang"],
  Rust: ["rust", "rustlang"],
  Swift: ["swift", "swiftui", "ios development"],
  Kotlin: ["kotlin", "android development", "android developer"],
  Flutter: ["flutter", "dart"],
  "React Native": ["react native"],
  SQL: ["sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "sql server", "oracle db", "pl/sql"],
  MongoDB: ["mongodb", "mongo", "nosql"],
  Redis: ["redis"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  Azure: ["azure", "microsoft azure", "azure devops"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker", "containerization", "containerisation"],
  Kubernetes: ["kubernetes", "k8s", "helm"],
  "CI/CD": ["ci/cd", "jenkins", "gitlab ci", "github actions", "continuous integration"],
  Git: ["git", "github", "gitlab", "bitbucket", "version control"],
  Linux: ["linux", "unix", "bash", "shell scripting", "ubuntu"],
  "Machine Learning": ["machine learning", "deep learning", "tensorflow", "pytorch", "keras", "scikit-learn"],
  "Data Analysis": ["data analysis", "data analytics", "analytics", "spss", "stata", "power bi", "tableau", "looker", "data visualization", "data visualisation"],
  API: ["api", "rest api", "restful", "graphql", "api integration"],
  Testing: ["software testing", "qa", "quality assurance", "selenium", "jest", "unit testing", "test automation"],
  Microservices: ["microservices", "service mesh"],
  Cloud: ["cloud", "cloud computing", "cloud infrastructure", "cloud platforms", "serverless"],
  "Cloud Security": ["cloud security", "iam", "zero trust", "cspm"],
  Cybersecurity: ["cybersecurity", "cyber security", "information security", "network security", "penetration testing", "siem", "soc analyst", "vulnerability management", "iso 27001", "ethical hacking"],
  Networking: ["networking", "cisco", "ccna", "lan", "wan", "wi-fi", "wifi", "routers", "switches", "tcp/ip"],
  "IT Support": ["it support", "helpdesk", "help desk", "technical support", "troubleshooting", "active directory", "windows 10", "windows 11", "hardware support", "desktop support"],
  "Microsoft Office": ["microsoft office", "ms office", "ms word", "microsoft word", "powerpoint", "office 365", "microsoft 365", "outlook"],
  Excel: ["excel", "spreadsheets", "spreadsheet", "pivot tables", "vlookup"],
  "UI/UX": ["ui/ux", "ui design", "ux design", "user experience", "user interface", "wireframing", "prototyping"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "figma", "canva", "indesign", "adobe creative", "after effects", "premiere pro"],
  Agile: ["agile", "scrum", "kanban", "jira"],

  // ── Business, finance & admin ────────────────────────────────────────────
  Accounting: ["accounting", "accountant", "bookkeeping", "book-keeping", "financial reporting", "management accounts", "general ledger", "ifrs", "accounts payable", "accounts receivable"],
  "ACCA / ICAG": ["acca", "icag", "cpa", "cima", "chartered accountant"],
  "Financial Analysis": ["financial analysis", "financial modelling", "financial modeling", "budgeting", "forecasting", "variance analysis", "cash flow"],
  "Accounting Software": ["quickbooks", "sage", "tally", "xero", "sap", "oracle financials", "peachtree"],
  Payroll: ["payroll"],
  Tax: ["tax", "taxation", "vat", "paye", "withholding tax", "tax compliance", "gra filings"],
  Audit: ["audit", "auditing", "internal audit", "external audit", "internal controls"],
  "Bank Reconciliation": ["bank reconciliation", "bank reconciliations", "reconciliations", "reconciliation"],
  Banking: ["banking", "credit analysis", "loan processing", "teller", "microfinance", "mobile money", "momo", "kyc", "aml"],
  Finance: ["finance", "treasury", "investment analysis", "fintech"],
  "Customer Service": ["customer service", "customer support", "customer care", "client service", "client relations", "front desk", "call centre", "call center"],
  // No bare "administration": it also appears in "medication administration"
  // and "database administration".
  Administration: ["administrative", "administrative assistant", "administrative support", "office management", "office administration", "business administration", "clerical", "records management", "filing", "minute taking", "diary management"],
  "Data Entry": ["data entry", "data capture"],
  Procurement: ["procurement", "purchasing", "sourcing", "tendering", "supplier management", "vendor management"],
  "Supply Chain & Logistics": ["logistics", "supply chain", "warehouse", "warehousing", "inventory", "inventory management", "stock control", "fleet management", "shipping", "clearing and forwarding"],
  Sales: ["sales", "crm", "salesforce", "business development", "lead generation", "sales targets", "negotiation", "b2b", "b2c", "account management", "upselling"],
  Marketing: ["marketing", "digital marketing", "seo", "sem", "social media", "social media marketing", "content marketing", "content creation", "campaign management", "brand management", "google ads", "meta ads", "email marketing"],
  "Project Management": ["project management", "pmp", "prince2", "project planning", "project coordination", "ms project"],
  "Monitoring & Evaluation": ["m&e", "monitoring and evaluation", "monitoring & evaluation", "logframe", "impact assessment"],
  "NGO & Development": ["ngo", "donor reporting", "grant writing", "proposal writing", "community mobilisation", "community mobilization", "programme management", "program management", "usaid", "unicef"],
  "Legal & Compliance": ["compliance", "regulatory compliance", "legal", "contract management", "contracts", "due diligence", "corporate governance", "paralegal"],
  HR: ["human resources", "hr", "recruitment", "talent acquisition", "onboarding", "employee relations", "performance management", "hris", "labour law", "labor law"],
  "Report Writing": ["report writing", "reporting", "documentation", "technical writing"],
  Research: ["research", "data collection", "market research", "field research", "survey design", "qualitative research", "quantitative research"],

  // ── People & communication ───────────────────────────────────────────────
  Leadership: ["leadership", "team lead", "team leadership", "mentoring", "people management", "team management", "supervising", "supervision", "supervisory"],
  Communication: ["communication", "communication skills", "written communication", "verbal communication", "interpersonal", "interpersonal skills", "public speaking", "stakeholder management", "presentation skills"],
  "Problem Solving": ["problem solving", "problem-solving", "analytical skills", "critical thinking", "attention to detail"],
  "Time Management": ["time management", "multitasking", "multi-tasking", "prioritisation", "prioritization", "deadlines"],
  Teamwork: ["teamwork", "team player", "collaboration", "cross-functional"],
  French: ["french", "bilingual", "francophone"],

  // ── Field, technical & service roles ─────────────────────────────────────
  Teaching: ["teaching", "lesson planning", "classroom management", "curriculum", "tutoring", "lecturing", "teacher"],
  Healthcare: ["nursing", "nurse", "registered nurse", "patient care", "clinical", "pharmacy", "midwifery", "laboratory", "phlebotomy", "first aid", "medication administration", "wound care", "wound dressing", "vital signs", "infection control", "nmc"],
  Engineering: ["electrical engineering", "mechanical engineering", "civil engineering", "autocad", "solidworks", "site supervision", "quantity surveying", "structural design", "maintenance engineering"],
  "Health & Safety": ["hse", "health and safety", "occupational health", "safety compliance", "risk assessment", "nebosh", "iosh"],
  Hospitality: ["hospitality", "housekeeping", "food and beverage", "front office", "guest relations", "barista", "culinary", "catering"],
  Agriculture: ["agronomy", "agriculture", "agribusiness", "farm management", "crop production", "livestock", "extension services"],
  "Driver's Licence": ["driver's license", "driver's licence", "driving licence", "driving license", "valid licence", "valid license"],
  "Security Operations": ["security guard", "security officer", "cctv", "access control", "patrol"],
};

// Listed in nearly every advert and almost never verbatim in a CV. Counting
// them as "missing" drags every score down and fills "Skills to add" with
// "Communication" — noise, not advice. Kept out of the keyword score.
export const SOFT_SKILLS = new Set<string>([
  "Communication",
  "Problem Solving",
  "Time Management",
  "Teamwork",
  "Report Writing",
]);

type CompiledSkill = { skill: string; regex: RegExp };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// Whole-token boundaries that tolerate the punctuation real skill names use
// (c#, .net, node.js, ci/cd, m&e). Plain \b would split "c#" and ".net".
// No lookbehind: this runs in the browser for the feed quick-match and older
// iOS Safari (pre-16.4) throws on `(?<!`.
function aliasPattern(aliases: string[]): RegExp {
  const body = aliases
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  return new RegExp(`(?:^|[^a-z0-9+#])(?:${body})(?![a-z0-9+#])`, "i");
}

let compiled: CompiledSkill[] | null = null;

function getCompiled(): CompiledSkill[] {
  if (!compiled) {
    compiled = Object.entries(SKILL_KEYWORDS).map(([skill, aliases]) => ({
      skill,
      regex: aliasPattern(aliases),
    }));
  }
  return compiled;
}

/** Canonical skills mentioned anywhere in free text (job advert, CV, profile). */
export function extractSkills(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const { skill, regex } of getCompiled()) {
    if (regex.test(text)) found.push(skill);
  }
  return found;
}

/**
 * Turn a raw CV skill string ("React and Next.js", "Excel", "and Python")
 * into canonical skills. Falls back to the cleaned raw string when nothing in
 * the dictionary matches but the string still looks like a skill.
 */
export function canonicalizeSkill(raw: string): string[] {
  if (isJunkSkillFragment(raw)) return [];
  const cleaned = cleanSkillLabel(raw);
  if (!cleaned) return [];
  const canonical = extractSkills(cleaned);
  if (canonical.length > 0) return canonical;
  return isPlausibleSkillLabel(cleaned) ? [cleaned] : [];
}

export function sanitizeSkillList(raw: string[]): string[] {
  return [
    ...new Set(
      raw
        .filter((s): s is string => typeof s === "string")
        .flatMap((s) => canonicalizeSkill(s)),
    ),
  ];
}

/** Whole CV-parser lines that must never be scanned for dictionary hits. */
function isJunkSkillFragment(raw: string): boolean {
  return /[@]|https?:|www\.|github\.com|linkedin\.com|\.com\b|\.io\b|\(remote\)/i.test(raw);
}

const LEADING_JUNK = /^(?:and|or|with|using|in|of|the|a|an|plus|also|including|•|-|–|—|·|\*)\s+/i;

/** Strip list conjunctions, bullets and trailing punctuation from a CV fragment. */
export function cleanSkillLabel(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) s = s.replace(LEADING_JUNK, "").trim();
  s = s.replace(/^[•\-–—·*]+\s*/, "").replace(/[.,;:•]+$/, "").trim();
  return s;
}

/**
 * Reject fragments the naive CV parser produces: emails, URLs, handles,
 * sentence-length phrases, bare verbs like "labeled" or "uptime".
 */
export function isPlausibleSkillLabel(s: string): boolean {
  if (s.length < 2 || s.length > 40) return false;
  if (/[@]|https?:|www\.|\.com\b|\.io\b|github|linkedin|\(remote\)|·|•/i.test(s)) return false;
  if (/\d{7,}/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length > 3) return false;
  if (/^(?:and|or|with|using|the|of|in|work|working|labeled|labelled|uptime|etc)$/i.test(s)) return false;
  // Bare handles / slug lines the PDF parser treated as skills
  if (words.length === 1 && /^[a-z0-9._-]{8,}$/i.test(s) && !/[A-Z]/.test(s[0])) return false;
  if (/^(?:build|built|work|worked|develop|developed|manage|managed|maintain|maintained|create|created)\b/i.test(s) && words.length > 1) return false;
  return true;
}

/** True when a skill (canonical or raw) is mentioned as a whole token in text. */
export function skillMentioned(text: string, skill: string): boolean {
  if (!text || !skill) return false;
  const aliases = SKILL_KEYWORDS[skill];
  if (aliases) return aliasPattern(aliases).test(text);
  const cleaned = cleanSkillLabel(skill);
  if (cleaned.length < 2) return false;
  return aliasPattern([cleaned]).test(text);
}
