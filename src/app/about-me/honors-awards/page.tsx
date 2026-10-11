import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Honors } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/honors-awards",
    title: "Honours and awards · CV",
    description: `${name}'s honours and awards in full, with dates and what each was for.`,
  });
}

export default async function Page() {
  const items = await getCvSection("honorsAwards");
  return (
    <SectionPageLayout id="honors" now={new Date()}>
      <Honors items={items} />
    </SectionPageLayout>
  );
}
