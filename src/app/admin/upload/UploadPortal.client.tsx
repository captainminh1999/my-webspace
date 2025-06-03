"use client";
import dynamic from 'next/dynamic';

// Defer loading of the large UploadForm until client side
const UploadForm = dynamic(() => import('./UploadForm'), { ssr: false });

export default function UploadPortal() {
  return <UploadForm />;
}
