export type SiteNavigationItem = {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
};

export const siteConfig = {
  companyName: "FRC Design & Construction",
  shortName: "FRC",
  leadArchitect: "Sheila Del Monte",
  leadArchitectRole: "Lead Architect",
  email: "frcdesignconstruction@gmail.com",
  emailLink: "mailto:frcdesignconstruction@gmail.com",
  phoneDisplay: "0420 978 236",
  phoneLink: "tel:+61420978236",
  location: "Sydney, NSW, Australia",
  socialLinks: {
    instagram: null,
    linkedIn: null,
    facebook: null,
    pinterest: null,
  } as Record<"instagram" | "linkedIn" | "facebook" | "pinterest", string | null>,
  navigation: [
    { label: "Home", href: "/" },
    {
      label: "Services",
      href: "/services",
      children: [
        { label: "Custom Home Design", href: "/services#custom-home-design" },
        { label: "Single-Storey Homes", href: "/services#single-storey-homes" },
        { label: "Double-Storey Homes", href: "/services#double-storey-homes" },
        { label: "Duplex Design", href: "/services#duplex-design" },
        { label: "Granny Flats", href: "/services#granny-flats" },
        { label: "Extensions & Alterations", href: "/services#extensions-alterations" },
        { label: "Townhouses & Multi-Dwelling", href: "/services#townhouses-multi-dwelling" },
        { label: "Commercial Design", href: "/services#commercial-design" },
        { label: "3D Rendering & Visualisation", href: "/services#visualisation" },
        { label: "Planning & Approval Support", href: "/services#planning-approval-support" },
      ],
    },
    { label: "Portfolio", href: "/portfolio" },
    {
      label: "Our Process",
      href: "/process",
      children: [
        { label: "Initial Consultation", href: "/process#initial-consultation" },
        { label: "Site & Planning Review", href: "/process#site-planning-review" },
        { label: "Concept Design", href: "/process#concept-design" },
        { label: "Design Development", href: "/process#design-development" },
        { label: "Documentation", href: "/process#documentation" },
        { label: "Consultants & Approvals", href: "/process#consultants-approvals" },
        { label: "Construction Support", href: "/process#construction-support" },
      ],
    },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ] satisfies SiteNavigationItem[],
  legalLinks: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Accessibility", href: "/accessibility" },
  ],
  quoteHref: "/#quote",
  footer: {
    brandLine: "Thoughtful design. Practical resolution. Spaces shaped around the way you live.",
    brandDescription: "Considered residential and built environments developed from early concept through documentation and coordination.",
    enquiryHeading: "Planning a new home, renovation or development?",
    enquiryCopy: "Tell us about your site, ideas and priorities. We’ll help you understand the next step.",
    designNotes: "Occasional insights on residential design, planning, materials and creating a stronger project brief.",
    serviceStatement: "Residential and built-environment design services across Sydney and surrounding areas.",
  },
} as const;

export const serviceCategories = [
  "Custom Home Design",
  "Single-Storey Homes",
  "Double-Storey Homes",
  "Duplex Design",
  "Granny Flats",
  "Extensions & Alterations",
  "Townhouses & Multi-Dwelling",
  "Commercial Design",
  "3D Rendering & Visualisation",
  "Planning & Approval Support",
] as const;

export const portfolioCategoryOrder = [
  "Custom Homes",
  "Single-Storey Homes",
  "Double-Storey Homes",
  "Duplexes",
  "Granny Flats",
  "Extensions & Alterations",
  "Townhouses",
  "Commercial",
  "Interiors",
  "3D Visualisations",
  "Documentation",
] as const;
