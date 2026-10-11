import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Education } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/education",
    title: "Education · CV",
    description: `${name}'s education in full: schools, degrees and dates, with activities and notes.`,
  });
}

export default async function Page() {
  const items = await getCvSection("education");
  return (
    <SectionPageLayout id="education" now={new Date()}>
      <Education items={items} />
    </SectionPageLayout>
  );
}
