import type { ReactNode } from "react";
import { PageCta } from "./page-cta";

export function LegalPage({ eyebrow, title, introduction, children }: { eyebrow: string; title: string; introduction: string; children: ReactNode }) {
  return (
    <main className="marketing-page legal-page">
      <header className="marketing-hero legal-hero"><span>{eyebrow}</span><h1>{title}</h1><p>{introduction}</p></header>
      <article className="legal-content">{children}</article>
      <PageCta eyebrow="Questions about this information" heading="Contact FRC directly." copy="If you need clarification about this website or how project information is handled, contact the lead architect." />
    </main>
  );
}
