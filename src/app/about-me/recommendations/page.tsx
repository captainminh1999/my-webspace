import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Recommendations } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/recommendations",
    title: "Recommendations · CV",
    description: `${name}'s recommendations in full, with each writer's role and company.`,
  });
}

export default async function Page() {
  const items = await getCvSection("recommendationsReceived");
  return (
    <SectionPageLayout id="recommendations" now={new Date()}>
      <Recommendations items={items} />
    </SectionPageLayout>
  );
}
