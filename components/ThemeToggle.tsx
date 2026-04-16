"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "rb-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={[
          "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
          theme === "light"
            ? "border border-[#1D4ED8]/40 bg-[#1D4ED8]/10 text-[#1D4ED8]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
        ].join(" ")}
      >
        Claro
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={[
          "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
          theme === "dark"
            ? "border border-[#1D4ED8]/40 bg-[#1D4ED8]/10 text-[#1D4ED8]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
        ].join(" ")}
      >
        Oscuro
      </button>
    </div>
  );
}
