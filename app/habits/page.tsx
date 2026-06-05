'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type LastSevenDay = {
  date: string;
  completed: boolean;
};

type WeekDay = {
  date: string;
  label: string;
  dayOfMonth: string;
  isToday: boolean;
  isFuture: boolean;
};

type MoodInsight = {
  completedAverage: number;
  completedMood: string;
  missedAverage: number;
  missedMood: string;
  delta: number;
};

type Habit = {
  id: number;
  name: string;
  emoji: string;
  frequency: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  completedToday: boolean;
  completionRateThisMonth: number;
  lastSevenDays: LastSevenDay[];
  moodInsight: MoodInsight | null;
};

type HabitForm = {
  id: number | null;
  name: string;
  emoji: string;
  color: string;
};

const EMOJI_OPTIONS = ['🌱', '💧', '🏃', '🧘', '😴', '📚', '🥗', '🚶', '☀️', '📝', '💪', '🎯'];
const COLOR_OPTIONS = ['emerald', 'sky', 'violet', 'rose', 'amber', 'teal', 'indigo', 'pink'];
const DEFAULT_FORM: HabitForm = {
  id: null,
  name: '',
  emoji: '🌱',
  color: 'emerald',
};

const COLOR_STYLES: Record<string, {
  checkedCard: string;
  uncheckedCard: string;
  accent: string;
  soft: string;
  text: string;
  ring: string;
}> = {
  emerald: {
    checkedCard: 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10',
    uncheckedCard: 'border-emerald-200 hover:border-emerald-300 dark:border-emerald-400/20 dark:hover:border-emerald-400/40',
    accent: 'bg-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-400/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-400',
  },
  sky: {
    checkedCard: 'border-sky-300 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-400/10',
    uncheckedCard: 'border-sky-200 hover:border-sky-300 dark:border-sky-400/20 dark:hover:border-sky-400/40',
    accent: 'bg-sky-500',
    soft: 'bg-sky-50 dark:bg-sky-400/10',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-400',
  },
  violet: {
    checkedCard: 'border-violet-300 bg-violet-50 dark:border-violet-400/40 dark:bg-violet-400/10',
    uncheckedCard: 'border-violet-200 hover:border-violet-300 dark:border-violet-400/20 dark:hover:border-violet-400/40',
    accent: 'bg-violet-500',
    soft: 'bg-violet-50 dark:bg-violet-400/10',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-400',
  },
  rose: {
    checkedCard: 'border-rose-300 bg-rose-50 dark:border-rose-400/40 dark:bg-rose-400/10',
    uncheckedCard: 'border-rose-200 hover:border-rose-300 dark:border-rose-400/20 dark:hover:border-rose-400/40',
    accent: 'bg-rose-500',
    soft: 'bg-rose-50 dark:bg-rose-400/10',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-400',
  },
  amber: {
    checkedCard: 'border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10',
    uncheckedCard: 'border-amber-200 hover:border-amber-300 dark:border-amber-400/20 dark:hover:border-amber-400/40',
    accent: 'bg-amber-500',
    soft: 'bg-amber-50 dark:bg-amber-400/10',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-400',
  },
  teal: {
    checkedCard: 'border-teal-300 bg-teal-50 dark:border-teal-400/40 dark:bg-teal-400/10',
    uncheckedCard: 'border-teal-200 hover:border-teal-300 dark:border-teal-400/20 dark:hover:border-teal-400/40',
    accent: 'bg-teal-500',
    soft: 'bg-teal-50 dark:bg-teal-400/10',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-400',
  },
  indigo: {
    checkedCard: 'border-indigo-300 bg-indigo-50 dark:border-indigo-400/40 dark:bg-indigo-400/10',
    uncheckedCard: 'border-indigo-200 hover:border-indigo-300 dark:border-indigo-400/20 dark:hover:border-indigo-400/40',
    accent: 'bg-indigo-500',
    soft: 'bg-indigo-50 dark:bg-indigo-400/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-400',
  },
  pink: {
    checkedCard: 'border-pink-300 bg-pink-50 dark:border-pink-400/40 dark:bg-pink-400/10',
    uncheckedCard: 'border-pink-200 hover:border-pink-300 dark:border-pink-400/20 dark:hover:border-pink-400/40',
    accent: 'bg-pink-500',
    soft: 'bg-pink-50 dark:bg-pink-400/10',
    text: 'text-pink-700 dark:text-pink-300',
    ring: 'ring-pink-400',
  },
};

const getColorStyles = (color: string) => COLOR_STYLES[color] ?? COLOR_STYLES.emerald;

const getLocalDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addLocalDays = (dateKey: string, days: number) => {
  const date = parseLocalDateKey(dateKey);

  date.setDate(date.getDate() + days);

  return toLocalDateKey(date);
};

const getCurrentWeekDays = (todayKey: string): WeekDay[] => {
  const today = parseLocalDateKey(todayKey);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mondayKey = addLocalDays(todayKey, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = parseLocalDateKey(addLocalDays(mondayKey, index));
    const dateKey = toLocalDateKey(date);

    return {
      date: dateKey,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayOfMonth: String(date.getDate()),
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    };
  });
};

const getErrorMessage = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);

  return data?.error || fallback;
};

export default function HabitsPage() {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const currentWeekDays = useMemo(() => getCurrentWeekDays(todayKey), [todayKey]);
  const todayLabel = useMemo(() => (
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  ), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [form, setForm] = useState<HabitForm>(DEFAULT_FORM);
  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [completionLoadingId, setCompletionLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const params = new URLSearchParams({ date: todayKey });
      const response = await fetch(`/api/habits?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data.habits)) {
        setHabits(data.habits);
      } else {
        setPageError(data.error || 'Failed to load habits.');
      }
    } catch {
      setPageError('Failed to load habits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void fetchHabits();
  }, [fetchHabits]);

  const completedToday = habits.filter((habit) => habit.completedToday).length;
  const totalHabits = habits.length;
  const progressPercent = totalHabits ? Math.round((completedToday / totalHabits) * 100) : 0;
  const allDone = totalHabits > 0 && completedToday === totalHabits;

  const openAddForm = () => {
    setForm(DEFAULT_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (habit: Habit) => {
    setForm({
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSaving) return;

    setFormOpen(false);
    setForm(DEFAULT_FORM);
    setFormError('');
  };

  const handleSaveHabit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Give your habit a clear name first.');
      return;
    }

    setFormSaving(true);
    setFormError('');
    setActionMessage('');

    try {
      const response = await fetch('/api/habits', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to save habit.'));
      }

      setActionMessage(form.id ? 'Habit updated.' : 'Habit added to today.');
      setFormOpen(false);
      setForm(DEFAULT_FORM);
      await fetchHabits();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save habit.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleHabit = async (habit: Habit) => {
    const completed = !habit.completedToday;

    setCompletionLoadingId(habit.id);
    setActionMessage('');
    setPageError('');
    setHabits((currentHabits) => currentHabits.map((currentHabit) => (
      currentHabit.id === habit.id
        ? {
            ...currentHabit,
            completedToday: completed,
            lastSevenDays: currentHabit.lastSevenDays.map((day) => (
              day.date === todayKey ? { ...day, completed } : day
            )),
          }
        : currentHabit
    )));

    try {
      const response = await fetch('/api/habit-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          habitId: habit.id,
          date: todayKey,
          completed,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to update habit.'));
      }

      setActionMessage(completed ? `${habit.name} checked off for today.` : `${habit.name} marked incomplete.`);
      await fetchHabits();
    } catch (error) {
      setHabits((currentHabits) => currentHabits.map((currentHabit) => (
        currentHabit.id === habit.id
          ? {
              ...currentHabit,
              completedToday: habit.completedToday,
              lastSevenDays: currentHabit.lastSevenDays.map((day) => (
                day.date === todayKey ? { ...day, completed: habit.completedToday } : day
              )),
            }
          : currentHabit
      )));
      setPageError(error instanceof Error ? error.message : 'Failed to update habit.');
    } finally {
      setCompletionLoadingId(null);
    }
  };

  const handleDeleteHabit = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setActionMessage('');
    setPageError('');

    try {
      const response = await fetch('/api/habits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to delete habit.'));
      }

      setActionMessage(`${deleteTarget.name} was deleted.`);
      setDeleteTarget(null);
      await fetchHabits();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete habit.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <SignedIn>
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-gray-950 md:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Back to dashboard
                </Link>
                <h1 className="mt-3 text-4xl font-bold text-gray-950 dark:text-white md:text-5xl">
                  Habit Tracker
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 md:text-xl">
                  Build steady routines and see how completed habits line up with your mood.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/statistics"
                  className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-800"
                >
                  Mood Statistics
                </Link>
                <button
                  type="button"
                  onClick={openAddForm}
                  className="rounded-2xl bg-gray-950 px-5 py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                >
                  Add Habit
                </button>
              </div>
            </div>

            {(pageError || actionMessage) && (
              <div
                aria-live="polite"
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                  pageError
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200'
                }`}
              >
                {pageError || actionMessage}
              </div>
            )}

            <section className="mb-6 overflow-hidden rounded-3xl bg-gray-950 text-white shadow-xl shadow-sky-100/70">
              <div className="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.28),transparent_40%)] p-6 md:p-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-medium text-emerald-200">{todayLabel}</p>
                    <h2 className="mt-2 text-3xl font-bold">Today&apos;s Habits</h2>
                    <p className="mt-2 text-emerald-50">
                      {totalHabits
                        ? `${completedToday} of ${totalHabits} habits completed today`
                        : 'Start with one small habit and let the momentum build.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
                    <p className="text-sm text-emerald-100">Daily progress</p>
                    <p className="mt-1 text-3xl font-bold">{progressPercent}%</p>
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-300 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {allDone && (
                  <div className="mt-5 rounded-2xl border border-emerald-200/30 bg-emerald-300/15 px-4 py-3 text-emerald-50">
                    Beautiful work. Every habit is checked off for today.
                  </div>
                )}
              </div>
            </section>

            {loading && (
              <section className="mb-6 rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                <p className="text-gray-500 dark:text-gray-400">Loading your habits...</p>
              </section>
            )}

            {!loading && habits.length === 0 && (
              <section className="mb-6 rounded-3xl border border-dashed border-emerald-300 bg-white p-8 text-center shadow-xl shadow-emerald-100/50 dark:border-emerald-400/30 dark:bg-slate-900 dark:shadow-none">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-4xl dark:bg-emerald-400/10">
                  🌱
                </div>
                <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">
                  You haven&apos;t added any habits yet.
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-300">
                  Start with one small thing. A tiny routine done daily is easier to trust than a huge plan done rarely.
                </p>
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-6 rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                >
                  Add Your First Habit
                </button>
              </section>
            )}

            {!loading && habits.length > 0 && (
              <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {habits.map((habit) => {
                  const styles = getColorStyles(habit.color);

                  return (
                    <button
                      key={habit.id}
                      type="button"
                      aria-pressed={habit.completedToday}
                      disabled={completionLoadingId === habit.id}
                      onClick={() => void handleToggleHabit(habit)}
                      className={`group rounded-3xl border bg-white p-5 text-left shadow-lg shadow-sky-100/40 transition-all hover:-translate-y-1 disabled:cursor-wait disabled:opacity-70 dark:bg-slate-900 dark:shadow-none ${
                        habit.completedToday ? styles.checkedCard : styles.uncheckedCard
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="text-4xl" aria-hidden="true">{habit.emoji}</span>
                          <div className="min-w-0">
                            <h3 className={`text-xl font-semibold text-gray-950 transition dark:text-white ${
                              habit.completedToday ? 'line-through decoration-2 opacity-70' : ''
                            }`}>
                              {habit.name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{habit.frequency}</p>
                          </div>
                        </div>
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-xl transition ${
                          habit.completedToday
                            ? `${styles.accent} border-transparent text-white shadow-md`
                            : 'border-gray-300 text-transparent group-hover:border-gray-400 dark:border-white/20'
                        }`}>
                          ✓
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${styles.soft} ${styles.text}`}>
                          {habit.completionRateThisMonth}% this month
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-slate-950 dark:text-gray-300">
                          Tap to {habit.completedToday ? 'undo' : 'complete'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </section>
            )}

            <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Manage routines</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">My Habits</h2>
                </div>
                <button
                  type="button"
                  onClick={openAddForm}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/20"
                >
                  Add New Habit
                </button>
              </div>

              {habits.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Your habits will appear here once you add the first one.
                </p>
              ) : (
                <div className="space-y-4">
                  {habits.map((habit) => {
                    const styles = getColorStyles(habit.color);

                    return (
                      <article key={habit.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl" aria-hidden="true">{habit.emoji}</span>
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{habit.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {habit.frequency} · {habit.completionRateThisMonth}% completion this month
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              {habit.lastSevenDays.map((day) => (
                                <span
                                  key={day.date}
                                  title={`${day.date}: ${day.completed ? 'completed' : 'not completed'}`}
                                  className={`h-3 w-8 rounded-full ${
                                    day.completed ? styles.accent : 'bg-gray-200 dark:bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>

                            <div className={`mt-4 rounded-2xl p-4 ${styles.soft}`}>
                              <p className={`text-sm font-medium ${styles.text}`}>
                                Mood insight
                              </p>
                              {habit.moodInsight ? (
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                  On days you complete this habit, your average mood is{' '}
                                  <span className="font-semibold">{habit.moodInsight.completedMood}</span> ({habit.moodInsight.completedAverage})
                                  {' '}vs <span className="font-semibold">{habit.moodInsight.missedMood}</span> ({habit.moodInsight.missedAverage})
                                  {' '}on missed days.
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  Log moods on completed and missed days to unlock this comparison.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(habit)}
                              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(habit)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-3xl border border-white bg-white p-6 shadow-xl shadow-sky-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-700 dark:text-sky-300">Weekly overview</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Current Week</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mon to Sun habit consistency</p>
              </div>

              {habits.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Add habits to see your weekly consistency here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    <div className="grid grid-cols-[minmax(10rem,1.6fr)_repeat(7,minmax(4rem,1fr))] gap-2">
                      <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500 dark:bg-slate-950 dark:text-gray-400">
                        Habit
                      </div>
                      {currentWeekDays.map((day) => (
                        <div
                          key={day.date}
                          className={`rounded-2xl px-3 py-3 text-center ${
                            day.isToday
                              ? 'bg-sky-600 text-white shadow-lg shadow-sky-100 dark:bg-sky-400 dark:text-slate-950 dark:shadow-none'
                              : day.isFuture
                                ? 'bg-gray-50 text-gray-400 dark:bg-slate-950 dark:text-gray-600'
                                : 'bg-gray-50 text-gray-700 dark:bg-slate-950 dark:text-gray-200'
                          }`}
                        >
                          <p className="text-sm font-semibold">{day.label}</p>
                          <p className={`mt-1 text-xs ${day.isToday ? 'text-sky-50 dark:text-slate-800' : 'text-gray-400 dark:text-gray-500'}`}>
                            {day.dayOfMonth}
                          </p>
                        </div>
                      ))}

                      {habits.map((habit) => {
                        const styles = getColorStyles(habit.color);
                        const completedDates = new Set(
                          habit.lastSevenDays
                            .filter((day) => day.completed)
                            .map((day) => day.date),
                        );
                        const createdDateKey = habit.createdAt.slice(0, 10);

                        return (
                          <div key={habit.id} className="contents">
                            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                              <span className="text-2xl" aria-hidden="true">{habit.emoji}</span>
                              <span className="truncate font-semibold text-gray-800 dark:text-gray-100">{habit.name}</span>
                            </div>

                            {currentWeekDays.map((day) => {
                              const isInactive = day.date < createdDateKey;
                              const isCompleted = completedDates.has(day.date);
                              const label = day.isFuture
                                ? 'Future day'
                                : isInactive
                                  ? 'Not tracked yet'
                                  : isCompleted
                                    ? 'Completed'
                                    : 'Missed';

                              return (
                                <div
                                  key={`${habit.id}-${day.date}`}
                                  title={`${habit.name} on ${day.date}: ${label}`}
                                  className={`flex h-16 items-center justify-center rounded-2xl border text-lg font-bold transition ${
                                    day.isToday
                                      ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200 dark:border-sky-400/40 dark:bg-sky-400/10 dark:ring-sky-400/20'
                                      : 'border-gray-100 bg-white dark:border-white/10 dark:bg-slate-900'
                                  } ${
                                    day.isFuture || isInactive
                                      ? 'text-gray-300 dark:text-gray-700'
                                      : isCompleted
                                        ? styles.text
                                        : 'text-rose-500 dark:text-rose-300'
                                  }`}
                                  aria-label={`${habit.name} on ${day.label}: ${label}`}
                                >
                                  {day.isFuture || isInactive ? (
                                    <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
                                  ) : isCompleted ? (
                                    <span aria-hidden="true">✓</span>
                                  ) : (
                                    <span aria-hidden="true">×</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {formOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="habit-form-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-5">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {form.id ? 'Adjust your routine' : 'Start small'}
                  </p>
                  <h2 id="habit-form-title" className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                    {form.id ? 'Edit Habit' : 'Add New Habit'}
                  </h2>
                </div>

                <form onSubmit={handleSaveHabit}>
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="habit-name">
                      Habit name
                    </label>
                    <input
                      id="habit-name"
                      value={form.name}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                      placeholder="e.g. Drink 2L of water"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="habit-emoji">
                      Emoji
                    </label>
                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setForm((currentForm) => ({ ...currentForm, emoji }))}
                          className={`flex h-11 items-center justify-center rounded-xl border text-2xl transition ${
                            form.emoji === emoji
                              ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300 dark:bg-emerald-400/10'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <input
                      id="habit-emoji"
                      value={form.emoji}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, emoji: event.target.value }))}
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100"
                      placeholder="Or type an emoji"
                    />
                  </div>

                  <div className="mb-5">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Frequency</p>
                    <div className="inline-flex rounded-2xl bg-emerald-50 p-1 dark:bg-emerald-400/10">
                      <span className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
                        Daily
                      </span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Color tag</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((color) => {
                        const styles = getColorStyles(color);

                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setForm((currentForm) => ({ ...currentForm, color }))}
                            className={`h-9 w-9 rounded-full ${styles.accent} ${
                              form.color === color ? `ring-4 ${styles.ring} ring-offset-2 dark:ring-offset-slate-900` : ''
                            }`}
                            aria-label={`Use ${color} color`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {formError && (
                    <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={formSaving}
                      className="rounded-2xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                    >
                      {formSaving ? 'Saving...' : form.id ? 'Save Habit' : 'Add Habit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-habit-title"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-300">This deletes its completion history</p>
                <h2 id="delete-habit-title" className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                  Delete {deleteTarget.name}?
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  This habit and every completed day attached to it will be removed.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleteLoading}
                    className="rounded-2xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                  >
                    Keep Habit
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteHabit}
                    disabled={deleteLoading}
                    className="rounded-2xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Habit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
