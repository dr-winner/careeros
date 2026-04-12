import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #6366f1",
    paddingBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1e1b4b",
    marginBottom: 8,
  },
  contact: {
    fontSize: 9,
    color: "#64748b",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contactItem: {
    marginRight: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6366f1",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#475569",
  },
  experienceItem: {
    marginBottom: 12,
  },
  experienceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#1e1b4b",
  },
  company: {
    fontSize: 10,
    color: "#64748b",
  },
  date: {
    fontSize: 9,
    color: "#64748b",
  },
  description: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#475569",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletDot: {
    width: 10,
    color: "#6366f1",
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: "#475569",
  },
  educationItem: {
    marginBottom: 8,
  },
  degree: {
    fontSize: 10,
    fontWeight: 600,
    color: "#1e1b4b",
  },
  institution: {
    fontSize: 9,
    color: "#64748b",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  skill: {
    fontSize: 9,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "3 8",
    borderRadius: 3,
  },
  textContent: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#475569",
  },
});

interface ParsedCV {
  name: string;
  contact: string[];
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
}

function parseCVContent(rawContent: string): ParsedCV {
  const lines = rawContent.split("\n");
  const parsed: ParsedCV = {
    name: "",
    contact: [],
    summary: "",
    experience: [],
    education: [],
    skills: [],
  };

  let currentSection = "";
  let currentExperience: ParsedCV["experience"][0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") continue;

    if (!parsed.name && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(trimmed)) {
      parsed.name = trimmed;
    } else if (trimmed.includes("@")) {
      parsed.contact.push(trimmed);
    } else if (/^\+?[\d\s-]{10,}$/.test(trimmed)) {
      parsed.contact.push(trimmed);
    } else if (/^PROFESSIONAL SUMMARY$/i.test(trimmed) || /^SUMMARY$/i.test(trimmed)) {
      currentSection = "summary";
    } else if (/^WORK EXPERIENCE$/i.test(trimmed) || /^EXPERIENCE$/i.test(trimmed)) {
      currentSection = "experience";
    } else if (/^EDUCATION$/i.test(trimmed)) {
      currentSection = "education";
    } else if (/^SKILLS$/i.test(trimmed)) {
      currentSection = "skills";
    } else if (currentSection === "summary") {
      parsed.summary += " " + trimmed;
    } else if (currentSection === "skills") {
      const skillParts = trimmed.split(/[,;•|]/).map((s) => s.trim()).filter(Boolean);
      parsed.skills.push(...skillParts);
    } else if (currentSection === "experience" && trimmed.startsWith("•")) {
      if (currentExperience) {
        currentExperience.bullets.push(trimmed.substring(1).trim());
      }
    } else if (currentSection === "experience" && /^[A-Z]/.test(trimmed) && !trimmed.startsWith("•")) {
      if (currentExperience) {
        parsed.experience.push(currentExperience);
      }
      const parts = trimmed.split(/\|/);
      currentExperience = {
        title: parts[0]?.trim() || trimmed,
        company: parts[1]?.trim() || "",
        duration: parts[2]?.trim() || "",
        bullets: [],
      };
    } else if (currentSection === "education" && /^[A-Z]/.test(trimmed)) {
      const parts = trimmed.split(/\|/);
      parsed.education.push({
        degree: parts[0]?.trim() || trimmed,
        institution: parts[1]?.trim() || "",
        year: parts[2]?.trim() || "",
      });
    }
  }

  if (currentExperience) {
    parsed.experience.push(currentExperience);
  }

  return parsed;
}

interface CVPDFProps {
  content: string;
}

export default function CVPDF({ content }: CVPDFProps) {
  const parsed = parseCVContent(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {parsed.name && (
          <View style={styles.header}>
            <Text style={styles.name}>{parsed.name}</Text>
            <View style={styles.contact}>
              {parsed.contact.map((item, index) => (
                <Text key={index} style={styles.contactItem}>
                  {item}
                </Text>
              ))}
            </View>
          </View>
        )}

        {parsed.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summary}>{parsed.summary}</Text>
          </View>
        )}

        {parsed.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {parsed.experience.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.jobTitle}>{exp.title}</Text>
                  {exp.duration && <Text style={styles.date}>{exp.duration}</Text>}
                </View>
                {exp.company && <Text style={styles.company}>{exp.company}</Text>}
                {exp.bullets.map((bullet, bIndex) => (
                  <View key={bIndex} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {parsed.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {parsed.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>
                  {edu.institution}
                  {edu.year && ` • ${edu.year}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {parsed.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {parsed.skills.slice(0, 25).map((skill, index) => (
                <Text key={index} style={styles.skill}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        {!parsed.name && !parsed.summary && (
          <View style={styles.section}>
            <Text style={styles.textContent}>{content}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
