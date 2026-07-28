"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { siteConfig, type SiteNavigationItem } from "../config/site";

function isActive(pathname: string, item: SiteNavigationItem) {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState<string[]>([]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 28);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setOpenDesktop(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const toggleMobileSection = (label: string) => {
    setOpenMobile((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  };

  return (
    <header className={`frc-header ${scrolled ? "is-scrolled" : ""} ${pathname === "/" && !scrolled ? "is-over-hero" : ""}`}>
      <div className="frc-header-inner">
        <Link className="frc-brand" href="/" aria-label={`${siteConfig.companyName} home`} onClick={() => setMobileOpen(false)}>
          <span className="frc-brand-mark">{siteConfig.shortName}</span>
          <span>DESIGN &<br />CONSTRUCTION</span>
        </Link>

        <nav className="frc-desktop-nav" aria-label="Primary navigation">
          {siteConfig.navigation.map((item) => {
            const active = isActive(pathname, item);
            if (!item.children) {
              return <Link key={item.label} className={active ? "active" : ""} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
            }
            const open = openDesktop === item.label;
            return (
              <div
                className={`frc-nav-group ${open ? "open" : ""}`}
                key={item.label}
                onFocus={() => setOpenDesktop(item.label)}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenDesktop(null); }}
                onMouseLeave={() => setOpenDesktop(null)}
              >
                <span>
                  <Link className={active ? "active" : ""} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>
                  <button type="button" aria-label={`Open ${item.label} menu`} aria-expanded={open} aria-controls={`desktop-${item.label.replaceAll(" ", "-").toLowerCase()}`} onClick={() => setOpenDesktop(open ? null : item.label)}>+</button>
                </span>
                <div className="frc-dropdown" id={`desktop-${item.label.replaceAll(" ", "-").toLowerCase()}`}>
                  <div><small>{item.label}</small><strong>Explore by stage<br />or project type.</strong></div>
                  <div>
                    {item.children.map((child, index) => <Link href={child.href} key={child.href} onClick={() => setOpenDesktop(null)}><span>{String(index + 1).padStart(2, "0")}</span>{child.label}<i>↗</i></Link>)}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="frc-header-actions">
          <a className="frc-phone" href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a>
          <Link className="frc-quote-button" href={siteConfig.quoteHref}>Request a Quote <span>↗</span></Link>
          <button className="frc-menu-toggle" type="button" aria-expanded={mobileOpen} aria-controls="frc-mobile-menu" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMobileOpen((open) => !open)}>
            <span /><span />
          </button>
        </div>
      </div>

      <div className={`frc-mobile-menu ${mobileOpen ? "open" : ""}`} id="frc-mobile-menu" aria-hidden={!mobileOpen}>
        <nav aria-label="Mobile navigation">
          {siteConfig.navigation.map((item) => {
            const active = isActive(pathname, item);
            if (!item.children) {
              return <Link key={item.label} className={active ? "active" : ""} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}>{item.label}<span>↗</span></Link>;
            }
            const expanded = openMobile.includes(item.label);
            const controlId = `mobile-${item.label.replaceAll(" ", "-").toLowerCase()}`;
            return (
              <div className="frc-mobile-group" key={item.label}>
                <div>
                  <Link className={active ? "active" : ""} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>
                  <button type="button" aria-expanded={expanded} aria-controls={controlId} aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`} onClick={() => toggleMobileSection(item.label)}>{expanded ? "−" : "+"}</button>
                </div>
                <div id={controlId} hidden={!expanded}>{item.children.map((child) => <Link href={child.href} key={child.href} onClick={() => setMobileOpen(false)}>{child.label}</Link>)}</div>
              </div>
            );
          })}
        </nav>
        <div className="frc-mobile-contact">
          <span>Start a conversation</span>
          <a href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a>
          <a href={siteConfig.emailLink}>{siteConfig.email}</a>
          <Link href={siteConfig.quoteHref} onClick={() => setMobileOpen(false)}>Request a Quote <span>→</span></Link>
        </div>
      </div>
    </header>
  );
}
