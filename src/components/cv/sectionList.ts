// The CV's sections, in reading order. Shared by the server shell and the client rail.
export const SECTIONS = [
  { id: "about", folio: "01", title: "About", href: null },
  { id: "experience", folio: "02", title: "Experience", href: "/about-me/experience" },
  { id: "education", folio: "03", title: "Education", href: "/about-me/education" },
  { id: "licenses", folio: "04", title: "Licences", href: "/about-me/licenses" },
  { id: "projects", folio: "05", title: "Projects", href: "/about-me/projects" },
  { id: "volunteering", folio: "06", title: "Volunteering", href: "/about-me/volunteering" },
  { id: "skills", folio: "07", title: "Skills", href: null },
  { id: "honors", folio: "08", title: "Honours", href: "/about-me/honors-awards" },
  { id: "languages", folio: "09", title: "Languages", href: "/about-me/languages" },
  { id: "recommendations", folio: "10", title: "Recommendations", href: "/about-me/recommendations" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];
