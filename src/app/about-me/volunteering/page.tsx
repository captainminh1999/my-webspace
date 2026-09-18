import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Volunteering } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Volunteering — CV", description: "Volunteering, in full." };

export default async function Page() {
  const items = await getCvSection("volunteering");
  return (
    <SectionPageLayout id="volunteering" now={new Date()}>
      <Volunteering items={items} />
    </SectionPageLayout>
  );
}
