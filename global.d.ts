/* Quick shim so `import foo from '@/data/file.json'` has type `any` */
type Apod = { url: string; thumbnail_url?: string; hdurl?: string; title: string; date: string; explanation: string };
import raw from '@/data/space.json';
const space = raw as Apod;

const thumb = space.thumbnail_url ?? space.url;

declare module '*.json' {
  const value: any;
  export default value;
}
