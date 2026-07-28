"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { portfolioCategoryOrder } from "../config/site";
import { projects } from "../data/projects";

const aliases: Record<string, string> = {
  "New Homes": "Custom Homes",
  "Renovations": "Extensions & Alterations",
  "Extensions": "Extensions & Alterations",
  "3D Visualisation": "3D Visualisations",
};

export function PortfolioExplorer() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("category") ?? "";
  const supported = useMemo(() => new Set(projects.flatMap((project) => [project.category, ...project.secondaryCategories])), []);
  const categories = portfolioCategoryOrder.filter((category) => supported.has(category));
  const initial = aliases[requested] ?? requested;
  const [active, setActive] = useState(categories.includes(initial as typeof categories[number]) ? initial : "All Projects");
  const visible = active === "All Projects" ? projects : projects.filter((project) => project.category === active || project.secondaryCategories.includes(active as never));

  return (
    <>
      <div className="portfolio-filters" role="group" aria-label="Filter projects by type">
        {["All Projects", ...categories].map((category) => <button type="button" key={category} className={active === category ? "active" : ""} aria-pressed={active === category} onClick={() => setActive(category)}>{category}<span>{category === "All Projects" ? projects.length : projects.filter((project) => project.category === category || project.secondaryCategories.includes(category as never)).length}</span></button>)}
      </div>
      <div className="portfolio-grid" id="portfolio-grid" aria-live="polite">
        {visible.map((project, index) => (
          <article className="portfolio-card" key={project.id} style={{ "--project-delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}>
            <Link href={`/portfolio/${project.slug}`}>
              <div className="portfolio-card-image">
                <img src={project.heroImage} alt={`${project.name}, ${project.type} design work by FRC Design & Construction`} loading={index < 2 ? "eager" : "lazy"} />
                <span>{String(project.gallery.length).padStart(2, "0")} images</span>
              </div>
              <div className="portfolio-card-copy">
                <span>{project.category} · {project.status}</span>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
                <small>{project.location}<i>View project →</i></small>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
