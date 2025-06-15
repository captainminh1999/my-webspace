export type CvSection = keyof import('@/types').FullCvData;

export async function getCvSection<S extends CvSection>(section: S): Promise<import('@/types').FullCvData[S]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    process.env.URL || 'http://localhost:8888';
  const url = `${baseUrl}/.netlify/functions/get-cv-section?section=${encodeURIComponent(section)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch CV section '${section}': ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<import('@/types').FullCvData[S]>;
}
