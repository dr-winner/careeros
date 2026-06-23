import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { StructuredCV } from "@/app/api/cv-regenerate/route";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { padding: "40 48", fontFamily: "Inter", fontSize: 10, color: "#1a1a2e", backgroundColor: "#ffffff" },

  // Header
  header: { marginBottom: 20 },
  name: { fontSize: 22, fontWeight: 700, color: "#1e1b4b", marginBottom: 6, letterSpacing: 0.3 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  contactItem: { fontSize: 9, color: "#4b5563" },
  contactDivider: { fontSize: 9, color: "#d1d5db", marginHorizontal: 4 },
  divider: { borderBottom: "1.5 solid #6366f1", marginTop: 12, marginBottom: 16 },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9, fontWeight: 700, color: "#6366f1", letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 8, paddingBottom: 4,
    borderBottom: "0.5 solid #e0e7ff",
  },

  // Summary
  summary: { fontSize: 9.5, lineHeight: 1.6, color: "#374151" },

  // Experience
  expItem: { marginBottom: 12 },
  expHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 },
  jobTitle: { fontSize: 10.5, fontWeight: 600, color: "#1e1b4b" },
  duration: { fontSize: 8.5, color: "#6b7280" },
  company: { fontSize: 9, color: "#6366f1", marginBottom: 5 },
  bullet: { flexDirection: "row", marginBottom: 2.5 },
  bulletDot: { width: 10, fontSize: 9, color: "#6366f1", marginTop: 1 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: "#374151" },

  // Education
  eduItem: { marginBottom: 8 },
  degree: { fontSize: 10, fontWeight: 600, color: "#1e1b4b" },
  institution: { fontSize: 9, color: "#6b7280", marginTop: 1 },

  // Skills
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  skill: { fontSize: 8.5, color: "#374151", backgroundColor: "#f0f0ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, border: "0.5 solid #c7d2fe" },

  // Certifications
  certText: { fontSize: 9, color: "#374151", lineHeight: 1.6 },
});

interface CVPDFProps {
  data: StructuredCV;
}

export default function CVPDF({ data }: CVPDFProps) {
  const contacts = [
    data.email,
    data.phone,
    data.location,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.name}>{data.name}</Text>
          <View style={s.contactRow}>
            {contacts.map((item, i) => (
              <View key={i} style={{ flexDirection: "row" }}>
                {i > 0 && <Text style={s.contactDivider}>|</Text>}
                <Text style={s.contactItem}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.divider} />

        {/* Summary */}
        {data.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Professional Summary</Text>
            <Text style={s.summary}>{data.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={s.expItem}>
                <View style={s.expHeader}>
                  <Text style={s.jobTitle}>{exp.title}</Text>
                  {exp.duration && <Text style={s.duration}>{exp.duration}</Text>}
                </View>
                {exp.company && <Text style={s.company}>{exp.company}</Text>}
                {exp.bullets?.map((bullet, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.bulletDot}>▸</Text>
                    <Text style={s.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={s.eduItem}>
                <Text style={s.degree}>{edu.degree}</Text>
                <Text style={s.institution}>
                  {edu.institution}{edu.year ? ` · ${edu.year}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {data.skills?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            <View style={s.skillsGrid}>
              {data.skills.map((skill, i) => (
                <Text key={i} style={s.skill}>{skill}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert, i) => (
              <Text key={i} style={s.certText}>▸ {cert}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
