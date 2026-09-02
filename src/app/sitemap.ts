import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://careeros.live";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/employers`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/sign-up`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/sign-in`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
