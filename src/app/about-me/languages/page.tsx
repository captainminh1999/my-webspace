import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Languages } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/languages",
    title: "Languages · CV",
    description: `The languages ${name} speaks, and how well.`,
  });
}

export default async function Page() {
  const items = await getCvSection("languages");
  return (
    <SectionPageLayout id="languages" now={new Date()}>
      <Languages items={items} />
    </SectionPageLayout>
  );
}
