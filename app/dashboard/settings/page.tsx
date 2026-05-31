'use client';

import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'wellness-theme';

type ProfileSettingsFormProps = {
  user: NonNullable<ReturnType<typeof useUser>['user']>;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as { errors: Array<{ message?: string }> }).errors)
  ) {
    return (error as { errors: Array<{ message?: string }> }).errors[0]?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const [firstName, setFirstName] = useState<string>(user.firstName ?? '');
  const [lastName, setLastName] = useState<string>(user.lastName ?? '');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [imageSaving, setImageSaving] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Wellness user';

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      await user.update({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      setProfileMessage('Profile updated successfully.');
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Failed to update your profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProfileImageFile(file);
    setProfileMessage('');
    setProfileError('');
  };

  const handleImageUpload = async () => {
    if (!profileImageFile) {
      setProfileError('Choose an image before uploading.');
      return;
    }

    setImageSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      await user.setProfileImage({ file: profileImageFile });
      setProfileImageFile(null);
      setProfileMessage('Profile picture updated successfully.');
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Failed to update your profile picture.'));
    } finally {
      setImageSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Profile
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
            User Profile Setup
          </h2>
          <p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-300">
            Your name and profile picture are saved in Clerk, so they stay tied to your account without adding new database tables.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950">
          <div
            className="h-16 w-16 rounded-full bg-cover bg-center ring-4 ring-white dark:ring-slate-800"
            style={{ backgroundImage: `url(${user.imageUrl})` }}
            aria-label={`${displayName} profile picture`}
            role="img"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.primaryEmailAddress?.emailAddress ?? 'Signed in with Clerk'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="mt-7 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="first-name">
            First name
          </label>
          <input
            id="first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100"
            placeholder="First name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="last-name">
            Last name
          </label>
          <input
            id="last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100"
            placeholder="Last name"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
          >
            {profileSaving ? 'Saving profile...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="profile-picture">
          Profile picture
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="profile-picture"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-700 dark:border-white/10 dark:bg-slate-900 dark:text-gray-200 dark:file:bg-emerald-400/10 dark:file:text-emerald-200"
          />
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={imageSaving || !profileImageFile}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/20"
          >
            {imageSaving ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
        {profileImageFile && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ready to upload: {profileImageFile.name}
          </p>
        )}
      </div>

      {(profileMessage || profileError) && (
        <p className={`mt-5 text-sm font-medium ${profileError ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
          {profileError || profileMessage}
        </p>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { isLoaded, user } = useUser();
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

            <div className="space-y-6">
              {!isLoaded && (
                <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                  <p className="text-gray-500 dark:text-gray-400">Loading profile settings...</p>
                </section>
              )}

              {isLoaded && user && <ProfileSettingsForm key={user.id} user={user} />}

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
          </div>
        </main>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
