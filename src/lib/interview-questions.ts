export interface InterviewQuestion {
  id: string;
  category: "behavioral" | "technical" | "situational" | "role-specific";
  question: string;
  tips: string[];
  sampleAnswer?: string;
  roleType?: string[];
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "Tell me about yourself",
    category: "behavioral",
    question: "Tell me about yourself",
    tips: [
      "Keep it under 2 minutes",
      "Start with your current role and recent experience",
      "Connect your past experience to this role",
      "End with why you're interested in this position",
    ],
    sampleAnswer: "I'm a software developer with 3 years of experience building web applications. Currently, I work at a fintech startup where I lead frontend development using React and TypeScript. Before that, I studied Computer Science at KNUST. I'm excited about this role because...",
    roleType: ["all"],
  },
  {
    id: "strengths-weaknesses",
    category: "behavioral",
    question: "What are your greatest strengths and weaknesses?",
    tips: [
      "Choose strengths relevant to the job",
      "For weakness, pick something real but not critical",
      "Explain what you're doing to improve",
      "Be specific with examples",
    ],
    sampleAnswer: "My greatest strength is my problem-solving ability. In my last role, I debugged a critical payment issue that had stumped the team for days. For weaknesses, I've been working on public speaking - I've started leading more team meetings to practice.",
    roleType: ["all"],
  },
  {
    id: "why-this-company",
    category: "behavioral",
    question: "Why do you want to work at this company?",
    tips: [
      "Research the company beforehand",
      "Mention specific products, values, or missions",
      "Connect your goals to what the company does",
      "Avoid generic answers like 'great company'",
    ],
    roleType: ["all"],
  },
  {
    id: "team-conflict",
    category: "behavioral",
    question: "Describe a time you had a conflict with a coworker",
    tips: [
      "Choose a professional conflict (not personal)",
      "Focus on resolution, not the conflict itself",
      "Show emotional intelligence",
      "Use the STAR method",
    ],
    sampleAnswer: "During a project, a colleague and I disagreed on the technical approach. I scheduled a one-on-one to understand their perspective. We realized both approaches had merit, so we combined elements and delivered a better solution than either would have alone.",
    roleType: ["all"],
  },
  {
    id: "leadership-example",
    category: "behavioral",
    question: "Tell me about a time you demonstrated leadership",
    tips: [
      "You don't need a formal leadership role",
      "Focus on initiative and influence",
      "Describe the outcome and impact",
      "Show what you learned",
    ],
    roleType: ["all"],
  },
  {
    id: "failure-lesson",
    category: "behavioral",
    question: "Tell me about a time you failed and what you learned",
    tips: [
      "Choose a real but recoverable failure",
      "Take responsibility",
      "Focus on lessons learned",
      "Show growth mindset",
    ],
    sampleAnswer: "I missed a project deadline because I underestimated the complexity. I communicated early with stakeholders and worked overtime to deliver quality work. Now I always add buffer time and break large tasks into smaller milestones.",
    roleType: ["all"],
  },
  {
    id: "problem-solving",
    category: "behavioral",
    question: "Describe a challenging problem and how you solved it",
    tips: [
      "Choose a relevant technical or business problem",
      "Show your thinking process",
      "Quantify the results if possible",
      "Be specific about your contribution",
    ],
    roleType: ["all"],
  },
  {
    id: "pressure-handling",
    category: "situational",
    question: "How do you handle working under pressure?",
    tips: [
      "Acknowledge that pressure is part of work",
      "Share specific strategies",
      "Give an example",
      "Show you're calm under stress",
    ],
    sampleAnswer: "I prioritize tasks by urgency and impact. When facing tight deadlines, I break work into smaller chunks and communicate proactively with stakeholders. For example, during a product launch, I created a daily tracker that helped the team stay aligned and we delivered on time.",
    roleType: ["all"],
  },
  {
    id: "multitasking",
    category: "situational",
    question: "How do you handle multiple projects at once?",
    tips: [
      "Show organization skills",
      "Mention tools you use",
      "Be honest about limits",
      "Emphasize communication",
    ],
    roleType: ["all"],
  },
  {
    id: "career-goals",
    category: "situational",
    question: "Where do you see yourself in 5 years?",
    tips: [
      "Be realistic but ambitious",
      "Align with the company's growth",
      "Show you plan to stay",
      "Focus on skills and impact",
    ],
    roleType: ["all"],
  },
  {
    id: "adaptation",
    category: "situational",
    question: "How do you adapt to change?",
    tips: [
      "Show flexibility and learning ability",
      "Give an example of adapting to change",
      "Emphasize continuous learning",
    ],
    roleType: ["all"],
  },
  {
    id: "tech-stack",
    category: "technical",
    question: "What technologies are you most proficient in?",
    tips: [
      "Be honest about your level",
      "Give practical examples of use",
      "Mention you're learning",
      "Connect to the job requirements",
    ],
    roleType: ["developer", "engineer", "data"],
  },
  {
    id: "code-review",
    category: "technical",
    question: "Describe your code review process",
    tips: [
      "Show attention to detail",
      "Mention both giving and receiving feedback",
      "Focus on code quality and best practices",
      "Be open to learning",
    ],
    roleType: ["developer", "engineer"],
  },
  {
    id: "system-design",
    category: "technical",
    question: "How would you design a scalable system?",
    tips: [
      "Start with understanding requirements",
      "Discuss components and their interactions",
      "Consider scaling, reliability, maintainability",
      "Think out loud",
    ],
    sampleAnswer: "First, I'd clarify requirements - what's the scale, read/write ratio, latency needs? Then I'd design the API layer, database choice, caching strategy, and consider horizontal scaling. I'd also discuss monitoring, error handling, and trade-offs.",
    roleType: ["developer", "engineer", "architect"],
  },
  {
    id: "debugging",
    category: "technical",
    question: "How do you approach debugging a complex issue?",
    tips: [
      "Show systematic thinking",
      "Mention specific tools",
      "Emphasize understanding root cause",
      "Show patience and persistence",
    ],
    roleType: ["developer", "engineer", "data"],
  },
  {
    id: "data-analysis",
    category: "technical",
    question: "How do you approach analyzing a new dataset?",
    tips: [
      "Start with understanding the data",
      "Check for missing values and outliers",
      "Form hypotheses before diving in",
      "Visualize to find patterns",
    ],
    roleType: ["data", "analyst", "scientist"],
  },
  {
    id: "sql-basics",
    category: "technical",
    question: "Write a SQL query to find duplicate records",
    tips: [
      "Use GROUP BY and HAVING",
      "Show understanding of aggregation",
      "Consider multiple approaches",
      "Explain your thought process",
    ],
    sampleAnswer: "SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1",
    roleType: ["data", "developer", "analyst"],
  },
  {
    id: "frontend-framework",
    category: "technical",
    question: "What are the pros and cons of React vs Vue?",
    tips: [
      "Show you understand both",
      "Be balanced in your analysis",
      "Know when to use each",
      "Mention current industry trends",
    ],
    roleType: ["frontend", "developer"],
  },
  {
    id: "salary-expectation",
    category: "situational",
    question: "What are your salary expectations?",
    tips: [
      "Research market rates for the role",
      "Give a range instead of exact number",
      "Consider total compensation",
      "Be flexible but know your worth",
    ],
    roleType: ["all"],
  },
  {
    id: "questions-for-us",
    category: "situational",
    question: "Do you have any questions for us?",
    tips: [
      "Always say yes",
      "Ask about team, culture, growth",
      "Avoid salary in first interview",
      "Show genuine interest",
    ],
    sampleAnswer: "I have a few questions: What does success look like in this role after 6 months? What's the team structure and how do you collaborate? What opportunities are there for learning and growth?",
    roleType: ["all"],
  },
];

export const QUESTION_CATEGORIES = [
  { id: "all", label: "All Questions", icon: "📋" },
  { id: "behavioral", label: "Behavioral", icon: "💬" },
  { id: "technical", label: "Technical", icon: "💻" },
  { id: "situational", label: "Situational", icon: "🎯" },
] as const;

export const ROLE_TYPES = [
  { id: "all", label: "All Roles" },
  { id: "developer", label: "Developer" },
  { id: "engineer", label: "Engineer" },
  { id: "data", label: "Data/Analytics" },
  { id: "analyst", label: "Analyst" },
  { id: "frontend", label: "Frontend" },
  { id: "scientist", label: "Scientist" },
  { id: "architect", label: "Architect" },
] as const;
