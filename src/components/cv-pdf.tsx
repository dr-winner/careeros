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
  page: { padding: "40 48", fontFamily: "Inter", fontSize: 9.5, color: "#111827", backgroundColor: "#ffffff" },

  // Header
  header: { marginBottom: 12, alignItems: "center" },
  name: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 6, letterSpacing: -0.2 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  contactItem: { fontSize: 8.5, color: "#4b5563" },
  contactDivider: { fontSize: 8.5, color: "#d1d5db", marginHorizontal: 2 },
  divider: { borderBottom: "1.5 solid #111827", marginTop: 8, marginBottom: 14 },

  // Section
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9, fontWeight: 700, color: "#111827", letterSpacing: 1.2,
    textTransform: "uppercase", marginBottom: 6, paddingBottom: 3,
    borderBottom: "0.5 solid #d1d5db",
  },

  // Summary
  summary: { fontSize: 9, lineHeight: 1.45, color: "#374151" },

  // Experience
  expItem: { marginBottom: 10 },
  expHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 },
  jobTitle: { fontSize: 9.5, fontWeight: 600, color: "#111827" },
  company: { fontSize: 9.5, fontWeight: 400, color: "#4b5563" },
  duration: { fontSize: 8.5, color: "#6b7280" },
  bullet: { flexDirection: "row", marginBottom: 2, paddingLeft: 6 },
  bulletDot: { width: 8, fontSize: 9, color: "#4b5563", marginTop: 0.5 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4, color: "#374151" },

  // Education
  eduItem: { marginBottom: 6 },
  eduHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  degree: { fontSize: 9.5, fontWeight: 600, color: "#111827" },
  institution: { fontSize: 9, color: "#4b5563", marginTop: 1 },
  eduYear: { fontSize: 8.5, color: "#6b7280" },

  // Skills
  skillsText: { fontSize: 9, lineHeight: 1.45, color: "#374151" },

  // Certifications
  certItem: { flexDirection: "row", marginBottom: 2, paddingLeft: 6 },
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
              <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                {i > 0 && <Text style={s.contactDivider}>•</Text>}
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
            <Text style={s.sectionTitle}>Professional Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={s.expItem}>
                <View style={s.expHeader}>
                  <Text style={s.jobTitle}>
                    {exp.title} <Text style={s.company}>| {exp.company}</Text>
                  </Text>
                  {exp.duration && <Text style={s.duration}>{exp.duration}</Text>}
                </View>
                {exp.bullets?.map((bullet, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
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
                <View style={s.eduHeader}>
                  <Text style={s.degree}>{edu.degree}</Text>
                  {edu.year && <Text style={s.eduYear}>{edu.year}</Text>}
                </View>
                {edu.institution && <Text style={s.institution}>{edu.institution}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {data.skills?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills & Expertise</Text>
            <Text style={s.skillsText}>{data.skills.join(", ")}</Text>
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Certifications & Licenses</Text>
            {data.certifications.map((cert, i) => (
              <View key={i} style={s.certItem}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{cert}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
