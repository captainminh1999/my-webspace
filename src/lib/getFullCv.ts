import type { FullCvData } from '@/types';

export async function getFullCv(): Promise<FullCvData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    process.env.URL || 'http://localhost:8888';
  const url = `${baseUrl}/.netlify/functions/get-full-cv`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch full CV data: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<FullCvData>;
}
