import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NSW Project Simulator | FRC Design & Construction",
  description: "Turn a NSW property address, land dimensions and project brief into a clear concept overview, planning-control screen and law-aware path to construction.",
};

export default function SimulatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
