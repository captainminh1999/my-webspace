import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Experience } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/experience",
    title: "Experience · CV",
    description: `${name}'s experience in full, company by company: titles, dates, locations, responsibilities and the skills each role used.`,
  });
}

export default async function Page() {
  const items = await getCvSection("experience");
  return (
    <SectionPageLayout id="experience" now={new Date()}>
      <Experience items={items} />
    </SectionPageLayout>
  );
}
