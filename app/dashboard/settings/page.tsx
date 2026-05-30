'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'wellness-theme';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [themeReady, setThemeReady] = useState<boolean>(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const prefersDark = savedTheme === 'dark';

      setDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
      setThemeReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDarkModeChange = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', enabled);
  };

  return (
    <>
      <SignedIn>
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Back to dashboard
                </Link>
                <h1 className="mt-3 text-4xl font-bold text-gray-950 dark:text-white md:text-5xl">
                  Settings
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 md:text-xl">
                  Tune your wellness space for the way you like to check in.
                </p>
              </div>
            </div>

            <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-sky-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Appearance
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                    Dark mode
                  </h2>
                  <p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-300">
                    Keep the dashboard easier on your eyes on this device. Your preference is saved locally in this browser.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  disabled={!themeReady}
                  onClick={() => handleDarkModeChange(!darkMode)}
                  className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    darkMode
                      ? 'border-emerald-400 bg-emerald-500'
                      : 'border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block h-7 w-7 rounded-full bg-white shadow-md transition-transform ${
                      darkMode ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">Toggle dark mode</span>
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-white/10 dark:bg-slate-950">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Current theme
                </p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Dark mode is on for this device.' : 'Light mode is on for this device.'}
                </p>
              </div>
            </section>
          </div>
        </main>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
