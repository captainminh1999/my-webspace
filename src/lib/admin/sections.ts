// src/lib/admin/sections.ts — no imports: the upload form (browser) and the upload handler (server) read the
// same list, and the form's chunk must not pull server code in with it.
export const CV_SECTIONS = [
  { id: "profile", name: "Profile" }, { id: "about", name: "About" }, { id: "experience", name: "Experience" },
  { id: "education", name: "Education" }, { id: "licenses", name: "Licenses & Certifications" }, { id: "projects", name: "Projects" },
  { id: "volunteering", name: "Volunteering" }, { id: "skills", name: "Skills" },
  { id: "recommendationsGiven", name: "Recommendations: Given" }, { id: "recommendationsReceived", name: "Recommendations: Received" },
  { id: "honorsAwards", name: "Honors & Awards" }, { id: "languages", name: "Languages" },
] as const;
// The whitelist is also what keeps `sectionIdentifier: "admin_credentials"` away from the admin collections.
export const isCvSection = (id: string): boolean => CV_SECTIONS.some((s) => s.id === id);
export const isSingletonSection = (id: string): boolean => id === "profile" || id === "about";
