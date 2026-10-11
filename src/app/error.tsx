"use client";

// src/app/error.tsx — the error boundary for every page under the root layout.
// A database outage does not land here: getDashboardData and getFullCv catch it and
// render empty cards and sections, and a failed ISR re-render keeps serving the last
// good copy. What does land here is code that threw — a component meeting data it did
// not expect, a client island failing in the browser — so the copy says that and
// nothing about stale data. error.message is never shown: from a server component it
// is a generic string in production, from a client one it can be anything.
import { useEffect } from "react";
import ErrorFrame from "@/components/ErrorFrame";

export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // retry(), not reset(): reset only re-renders what the browser already holds, which
    // cannot clear an error the server rendered; retry fetches the segment again first.
    <ErrorFrame kicker="ERROR" head="RENDER ERROR" reference={error.digest} title="This page failed to render." onRetry={retry}>
      <p>
        Something on it threw an error while the page was being put together, so this notice stands in for it. Trying again
        asks for a fresh copy, which clears most one-off faults; if it keeps failing, start from either page below.
      </p>
    </ErrorFrame>
  );
}
