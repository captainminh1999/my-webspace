"use client";
import { useEffect } from "react";

// One island for every widget dialog on the page. The dialogs themselves are
// server-rendered <dialog id="dialog-<id>" data-widget="<id>"> elements; this wires:
//   - [data-open-dialog="<id>"] buttons  → showModal() + ?w=<id> in the URL
//   - any close (Esc, the Close button, a backdrop click) → ?w removed
//   - a deep link /?w=<id> on load, and browser back/forward.
// Closing is observed through the dialog's `open` attribute rather than the
// `close` event, so it cannot depend on event timing.
const PARAM = "w";

function currentId() {
  return new URLSearchParams(location.search).get(PARAM);
}

function syncFromUrl() {
  const id = currentId();
  document.querySelectorAll<HTMLDialogElement>("dialog[data-widget]").forEach((d) => {
    if (d.dataset.widget === id) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  });
}

export default function DialogController() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest<HTMLElement>("[data-open-dialog]");
      if (trigger) {
        const id = trigger.dataset.openDialog!;
        if (!(document.getElementById(`dialog-${id}`) instanceof HTMLDialogElement)) return;
        e.preventDefault();
        const url = new URL(location.href);
        url.searchParams.set(PARAM, id);
        history.pushState({ [PARAM]: id }, "", url);
        syncFromUrl();
        return;
      }
      // Backdrop click: the dialog element is the target only outside its content box.
      const dialog = e.target as HTMLElement;
      if (dialog instanceof HTMLDialogElement && dialog.open) {
        const r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
      }
    };

    // When a dialog closes and the URL still names it, the user closed it: drop the param.
    // A close caused by syncFromUrl never matches, because the URL already changed.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const d = m.target as HTMLDialogElement;
        if (!d.open && currentId() === d.dataset.widget) {
          const url = new URL(location.href);
          url.searchParams.delete(PARAM);
          history.replaceState(null, "", url);
        }
      }
    });
    document.querySelectorAll<HTMLDialogElement>("dialog[data-widget]").forEach((d) =>
      observer.observe(d, { attributes: true, attributeFilter: ["open"] }),
    );

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", syncFromUrl);
    syncFromUrl();
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);
  return null;
}
