"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Helper to safely access localStorage
const safeLocal = {
  get: (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // After mount, determine the initial theme
  useEffect(() => {
    const stored = safeLocal.get("theme-preference");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored ? stored === "dark" : prefersDark);
    setMounted(true);
  }, []);

  // Apply theme class to <html> whenever isDark updates (after mount)
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("light-mode");
      root.classList.add("dark-mode");
      safeLocal.set("theme-preference", "dark");
    } else {
      root.classList.remove("dark-mode");
      root.classList.add("light-mode");
      safeLocal.set("theme-preference", "light");
    }
  }, [isDark, mounted]);

  // Render placeholder until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="p-2 rounded-full bg-white/10 text-white opacity-50 cursor-not-allowed"
        disabled
      >
        <Sun size={16} />
      </button>
    );
  }

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setIsDark((prev) => !prev)}
      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
} 