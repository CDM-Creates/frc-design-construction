"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInternal = pathname.startsWith("/simulation-results/") || pathname === "/simulator";
  if (isInternal) return children;
  return <><SiteHeader />{children}<SiteFooter /></>;
}
