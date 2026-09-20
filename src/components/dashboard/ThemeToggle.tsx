"use client";

// The only theme state lives on <html data-theme>, written before paint by the
// inline script in layout.tsx. This island flips it and remembers the choice;
// which word is highlighted comes from the light:/dark: variants, so the
// server-rendered markup is already right for either theme.
export default function ThemeToggle() {
  return (
    <button
      type="button"
      className="stamp text-ink-3 hover:text-ink transition-colors duration-120"
      aria-label="Light/Dark theme"
      onClick={() => {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
    >
      <span className="light:text-ink">Light</span>
      <span aria-hidden className="px-1">/</span>
      <span className="dark:text-ink">Dark</span>
    </button>
  );
}
