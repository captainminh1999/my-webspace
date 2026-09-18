import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Languages } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Languages — CV", description: "Languages, in full." };

export default async function Page() {
  const items = await getCvSection("languages");
  return (
    <SectionPageLayout id="languages" now={new Date()}>
      <Languages items={items} />
    </SectionPageLayout>
  );
}
