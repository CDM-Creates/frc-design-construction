import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/simulation-results/", "/api/"] },
    sitemap: "https://frc-design-construction.phoebe-ritumalta.chatgpt.site/sitemap.xml",
  };
}
