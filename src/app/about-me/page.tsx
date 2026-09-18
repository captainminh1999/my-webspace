// src/app/about-me/page.tsx — the CV as a long-form profile: a sticky index
// rail and a 720px reading column; structure from rules and type, not cards.
import type { Metadata } from "next";
import { getFullCv } from "@/lib/cv";
import { CvFrame, ProfileHeader, Rail, Section, SECTIONS, fullName } from "@/components/cv/CvShell";
import { About, AllLink, Education, Experience, Honors, Languages, Licences, Projects, Recommendations, Skills, Volunteering } from "@/components/cv/Sections";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cv = await getFullCv();
  const name = fullName(cv.profile);
  return {
    title: `${name} — CV`,
    description: cv.profile?.headline ? `${name}, ${cv.profile.headline}.` : `${name}'s curriculum vitae.`,
  };
}

const PREVIEW = 3;
const S = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<(typeof SECTIONS)[number]["id"], (typeof SECTIONS)[number]>;

export default async function AboutMePage() {
  const cv = await getFullCv();
  const now = new Date();

  return (
    <CvFrame now={now} rail={<Rail />}>
      <ProfileHeader profile={cv.profile} now={now} />

      <Section id="about" folio={S.about.folio} title={S.about.title}>
        <About about={cv.about} />
      </Section>

      <Section id="experience" folio={S.experience.folio} title={S.experience.title}>
        <Experience items={cv.experience} limit={PREVIEW} />
        {cv.experience.length > PREVIEW && <AllLink count={cv.experience.length} noun="companies" href={S.experience.href!} />}
      </Section>

      <Section id="education" folio={S.education.folio} title={S.education.title}>
        <Education items={cv.education} limit={PREVIEW} />
        {cv.education.length > PREVIEW && <AllLink count={cv.education.length} noun="entries" href={S.education.href!} />}
      </Section>

      <Section id="licenses" folio={S.licenses.folio} title={S.licenses.title}>
        <Licences items={cv.licenses} limit={PREVIEW} />
        {cv.licenses.length > PREVIEW && <AllLink count={cv.licenses.length} noun="credentials" href={S.licenses.href!} />}
      </Section>

      <Section id="projects" folio={S.projects.folio} title={S.projects.title}>
        <Projects items={cv.projects} limit={PREVIEW} />
        {cv.projects.length > PREVIEW && <AllLink count={cv.projects.length} noun="projects" href={S.projects.href!} />}
      </Section>

      <Section id="volunteering" folio={S.volunteering.folio} title={S.volunteering.title}>
        <Volunteering items={cv.volunteering} limit={PREVIEW} />
        {cv.volunteering.length > PREVIEW && <AllLink count={cv.volunteering.length} noun="roles" href={S.volunteering.href!} />}
      </Section>

      <Section id="skills" folio={S.skills.folio} title={S.skills.title}>
        <Skills skills={cv.skills} />
      </Section>

      <Section id="honors" folio={S.honors.folio} title={S.honors.title}>
        <Honors items={cv.honorsAwards} limit={PREVIEW} />
        {cv.honorsAwards.length > PREVIEW && <AllLink count={cv.honorsAwards.length} noun="honours" href={S.honors.href!} />}
      </Section>

      <Section id="languages" folio={S.languages.folio} title={S.languages.title}>
        <Languages items={cv.languages} />
      </Section>

      <Section id="recommendations" folio={S.recommendations.folio} title={S.recommendations.title}>
        <Recommendations items={cv.recommendationsReceived} limit={PREVIEW} />
        {cv.recommendationsReceived.length > PREVIEW && (
          <AllLink count={cv.recommendationsReceived.length} noun="recommendations" href={S.recommendations.href!} />
        )}
      </Section>
    </CvFrame>
  );
}
