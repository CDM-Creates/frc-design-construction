import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NSW Property Planning Simulator | FRC Design & Construction",
  description: "Build a source-traceable NSW property-planning scope, see deterministic FRC pricing and prepare an architect-ready report brief.",
};

export default function SimulatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
