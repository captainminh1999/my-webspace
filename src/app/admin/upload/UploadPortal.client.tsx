"use client";
import dynamic from 'next/dynamic';
import type { AdminView } from '@/lib/admin/view';
import PasskeyPanel from './PasskeyPanel';

// The form brings papaparse with it, so it is fetched only once there is a session to upload with.
const UploadForm = dynamic(() => import('./UploadForm'), { ssr: false });

// `view` is decided on the server (adminView). Hiding the form here is a courtesy, not the lock:
// POST /api/admin/upload checks the session itself.
export default function UploadPortal({ view, enrolmentDisabledReason }: { view: AdminView; enrolmentDisabledReason: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="sr-only">Admin upload portal</h1>
      {/* The panel keeps its place in the tree in every state, so its messages and the focus it manages survive a router.refresh(). */}
      <PasskeyPanel view={view} enrolmentDisabledReason={enrolmentDisabledReason} />
      {view.state === "upload" && <UploadForm />}
    </main>
  );
}
