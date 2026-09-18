"use client";
import { useEffect, useState } from "react";

// The only theme state lives on <html data-theme>, written before paint by the
// inline script in layout.tsx. This island just flips it and remembers the choice.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="stamp text-ink-3 hover:text-ink transition-colors duration-120"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
        setTheme(next);
      }}
    >
      <span className={theme === "light" ? "text-ink" : ""}>Light</span>
      <span aria-hidden className="px-1">/</span>
      <span className={theme === "dark" ? "text-ink" : ""}>Dark</span>
    </button>
  );
}
