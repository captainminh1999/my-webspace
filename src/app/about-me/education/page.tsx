import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Education } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Education — CV", description: "Education, in full." };

export default async function Page() {
  const items = await getCvSection("education");
  return (
    <SectionPageLayout id="education" now={new Date()}>
      <Education items={items} />
    </SectionPageLayout>
  );
}
