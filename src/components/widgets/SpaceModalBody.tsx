// src/components/widgets/SpaceModal.tsx
import space from '@/data/space.json';

const SpaceModalBody = () => (
  <article className="p-4 space-y-4">
    <h3 className="text-lg font-semibold">{space.title}</h3>
    <img src={space.url} alt={space.title} className="w-full rounded"/>
    <p className="text-sm text-gray-700 dark:text-gray-300">{space.explanation}</p>
    <a className="underline text-indigo-600" href={space.hdurl} target="_blank">
      View HD image
    </a>
  </article>
);
