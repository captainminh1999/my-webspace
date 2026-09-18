import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Experience } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Experience — CV", description: "Experience, in full." };

export default async function Page() {
  const items = await getCvSection("experience");
  return (
    <SectionPageLayout id="experience" now={new Date()}>
      <Experience items={items} />
    </SectionPageLayout>
  );
}
