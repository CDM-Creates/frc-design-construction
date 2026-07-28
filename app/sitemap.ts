import type { MetadataRoute } from "next";
import { projects } from "./data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://frc-design-construction.phoebe-ritumalta.chatgpt.site";
  const routes = ["", "/services", "/portfolio", "/process", "/about", "/contact", "/quote", "/privacy", "/terms", "/disclaimer", "/accessibility"];
  return [
    ...routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/portfolio" || route === "/services" ? .8 : .6 })),
    ...projects.map((project) => ({ url: `${base}/portfolio/${project.slug}`, changeFrequency: "monthly" as const, priority: .7 })),
  ];
}
