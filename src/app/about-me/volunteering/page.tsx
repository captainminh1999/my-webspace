import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Volunteering } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/volunteering",
    title: "Volunteering · CV",
    description: `${name}'s volunteer work in full: organisations, roles, causes and dates.`,
  });
}

export default async function Page() {
  const items = await getCvSection("volunteering");
  return (
    <SectionPageLayout id="volunteering" now={new Date()}>
      <Volunteering items={items} />
    </SectionPageLayout>
  );
}
