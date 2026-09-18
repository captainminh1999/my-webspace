import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Recommendations } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Recommendations — CV", description: "Recommendations, in full." };

export default async function Page() {
  const items = await getCvSection("recommendationsReceived");
  return (
    <SectionPageLayout id="recommendations" now={new Date()}>
      <Recommendations items={items} />
    </SectionPageLayout>
  );
}
