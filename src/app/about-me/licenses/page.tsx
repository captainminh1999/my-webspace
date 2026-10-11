import type { Metadata, ResolvingMetadata } from "next";
import { getCvSection, getProfile } from "@/lib/cv";
import { pageMetadata, ownerName } from "@/lib/site";
import SectionPageLayout from "@/components/cv/CvShell";
import { Licences } from "@/components/cv/Sections";

export const revalidate = 60;

// getProfile() is the read the root layout's metadata already made (React cache()).
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const name = ownerName(await getProfile().catch(() => null));
  return pageMetadata(parent, {
    path: "/about-me/licenses",
    title: "Licences and certifications · CV",
    description: `${name}'s licences and certifications in full, each with its issuing authority and dates.`,
  });
}

export default async function Page() {
  const items = await getCvSection("licenses");
  return (
    <SectionPageLayout id="licenses" now={new Date()}>
      <Licences items={items} />
    </SectionPageLayout>
  );
}
