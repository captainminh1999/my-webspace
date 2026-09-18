import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Projects } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Projects — CV", description: "Projects, in full." };

export default async function Page() {
  const items = await getCvSection("projects");
  return (
    <SectionPageLayout id="projects" now={new Date()}>
      <Projects items={items} />
    </SectionPageLayout>
  );
}
