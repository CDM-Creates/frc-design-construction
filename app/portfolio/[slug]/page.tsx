import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageCta } from "../../components/page-cta";
import { projectBySlug, projects } from "../../data/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
    openGraph: { title: `${project.name} | FRC Design & Construction`, description: project.summary, images: [project.heroImage] },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();
  return (
    <main className="marketing-page project-detail-page">
      <header className="project-detail-hero">
        <img src={project.heroImage} alt={`${project.name} architectural design view`} />
        <div>
          <span>{project.category} · {project.location}</span>
          <h1>{project.name}</h1>
          <p>{project.summary}</p>
        </div>
      </header>
      <section className="project-detail-overview">
        <div><span>Project overview</span><h2>A clear record of the design work currently available.</h2></div>
        <div>
          <p>{project.description}</p>
          <dl>
            <div><dt>Category</dt><dd>{project.category}</dd></div>
            <div><dt>Location</dt><dd>{project.location}</dd></div>
            <div><dt>Project type</dt><dd>{project.type}</dd></div>
            <div><dt>Record status</dt><dd>{project.status}</dd></div>
          </dl>
          <div className="project-feature-list"><span>Documented design features</span>{project.keyFeatures.map((feature) => <p key={feature}>{feature}</p>)}</div>
          {project.folio && <a className="project-folio-link" href={project.folio} target="_blank" rel="noreferrer">Open the public drawing folio <span>↗</span></a>}
        </div>
      </section>
      <section className="project-gallery" aria-labelledby="project-gallery-title">
        <header><span>Image gallery</span><h2 id="project-gallery-title">Drawings, studies<br />and visual direction.</h2></header>
        <div>{project.gallery.map((image, index) => <figure key={image}><img src={image} alt={`${project.name}: ${project.labels[index]}`} loading={index === 0 ? "eager" : "lazy"} /><figcaption><span>{String(index + 1).padStart(2, "0")}</span>{project.labels[index]}</figcaption></figure>)}</div>
      </section>
      <div className="project-detail-back"><Link href="/portfolio">← Return to all projects</Link></div>
      <PageCta eyebrow="Request a similar project" heading="Have a site with a related brief?" copy="Share the property and the outcome you are considering. FRC can review the information available and guide the next useful step." />
    </main>
  );
}
