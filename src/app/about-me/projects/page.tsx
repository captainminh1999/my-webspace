import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Projects } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/projects",
    title: "Projects · CV",
    description: `Every project on ${name}'s CV, in full: what each one was, with dates and links.`,
  });
}

export default async function Page() {
  const items = await getCvSection("projects");
  return (
    <SectionPageLayout id="projects" now={new Date()}>
      <Projects items={items} />
    </SectionPageLayout>
  );
}
