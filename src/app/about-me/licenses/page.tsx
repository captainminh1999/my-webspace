import type { Metadata } from "next";
import { getCvSection } from "@/lib/cv";
import SectionPageLayout from "@/components/cv/CvShell";
import { Licences } from "@/components/cv/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Licences and certifications — CV", description: "Licences and certifications, in full." };

export default async function Page() {
  const items = await getCvSection("licenses");
  return (
    <SectionPageLayout id="licenses" now={new Date()}>
      <Licences items={items} />
    </SectionPageLayout>
  );
}
