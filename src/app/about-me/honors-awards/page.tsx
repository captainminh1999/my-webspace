import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Honors } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Honours and awards — CV", description: "Honours and awards, in full." };

export default async function Page() {
  const items = await getCvSection("honorsAwards");
  return (
    <SectionPageLayout id="honors" now={new Date()}>
      <Honors items={items} />
    </SectionPageLayout>
  );
}
