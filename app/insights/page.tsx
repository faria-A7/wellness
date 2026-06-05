'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type InsightRange = '7' | '30' | '90' | 'custom';

type HabitCorrelation = {
  habitId: number;
  habitName: string;
  emoji: string;
  moodWhenDone: number | null;
  moodWhenSkipped: number | null;
  doneMood: string;
  skippedMood: string;
  completedMoodDays: number;
  skippedMoodDays: number;
};

type InsightResult = {
  mainInsight: string;
  patterns: Array<{
    type: string;
    emoji: string;
    title: string;
    body: string;
  }>;
  suggestions: string[];
  summary: string;
  habitCorrelations: HabitCorrelation[];
};

type SavedInsight = {
  id: number;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  result: InsightResult;
  createdAt: string;
};

const RANGE_OPTIONS: Array<{ value: InsightRange; label: string }> = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

const getLocalDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatScore = (score: number | null) => {
  return score === null ? '--' : score.toFixed(1);
};

const formatInsightDate = (value: string) => {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getErrorMessage = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);

  return data?.error || fallback;
};

export default function InsightsPage() {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [range, setRange] = useState<InsightRange>('30');
  const [customStart, setCustomStart] = useState<string>(addDays(todayKey, -29));
  const [customEnd, setCustomEnd] = useState<string>(todayKey);
  const [activeInsight, setActiveInsight] = useState<SavedInsight | null>(null);
  const [history, setHistory] = useState<SavedInsight[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string>('');

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setPageError('');

    try {
      const response = await fetch('/api/ai-insights?limit=12', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data.insights)) {
        setHistory(data.insights);
        setActiveInsight((current) => current ?? data.insights[0] ?? null);
      } else {
        setPageError(data.error || 'Failed to load insight history.');
      }
    } catch {
      setPageError('Failed to load insight history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setPageError('');
    setActionMessage('');

    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          range,
          startDate: customStart,
          endDate: customEnd,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to generate AI insight.'));
      }

      const data = await response.json();

      setActiveInsight(data.insight);
      setHistory((current) => [data.insight, ...current.filter((item) => item.id !== data.insight.id)]);
      setActionMessage('Your new insight is ready.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to generate AI insight.');
    } finally {
      setAnalyzing(false);
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
                  AI Mood Insights
                </h1>
                <p className="mt-3 max-w-3xl text-lg text-gray-600 dark:text-gray-300 md:text-xl">
                  Ask for a warm read on your mood patterns, notes, and routines whenever you want a deeper check-in.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/habits"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/20"
                >
                  Habits
                </Link>
                <Link
                  href="/dashboard/statistics"
                  className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-800"
                >
                  Statistics
                </Link>
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

            <section className="mb-6 rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/60 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="mb-5">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Insight controls</p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Choose what to analyze</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      range === option.value
                        ? 'bg-gray-950 text-white shadow-md dark:bg-emerald-500 dark:text-gray-950'
                        : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:bg-slate-950 dark:text-gray-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {range === 'custom' && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Start date
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd}
                      onChange={(event) => setCustomStart(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    End date
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      max={todayKey}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100"
                    />
                  </label>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                >
                  {analyzing && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-gray-950/30 dark:border-t-gray-950" />
                  )}
                  {analyzing ? 'Analyzing your logs...' : 'Analyze My Mood'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analysis is based on your logged moods and notes. The more you log, the more accurate the insights.
                </p>
              </div>
            </section>

            {activeInsight ? (
              <>
                <section className="mb-6 overflow-hidden rounded-3xl bg-gray-950 text-white shadow-xl shadow-sky-100/70">
                  <div className="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.28),transparent_40%)] p-6 md:p-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-emerald-200">{activeInsight.rangeLabel}</p>
                        <h2 className="mt-2 text-3xl font-bold">Your latest reflection</h2>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-emerald-50">
                        {formatInsightDate(activeInsight.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-lg leading-8 text-emerald-50">
                      {activeInsight.result.mainInsight}
                    </p>
                  </div>
                </section>

                <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {activeInsight.result.patterns.map((pattern, index) => (
                    <article
                      key={`${pattern.type}-${index}`}
                      className="rounded-3xl border border-white bg-white p-5 shadow-lg shadow-sky-100/40 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl dark:bg-emerald-400/10">
                        {pattern.emoji}
                      </div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{pattern.type}</p>
                      <h3 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">{pattern.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pattern.body}</p>
                    </article>
                  ))}
                </section>

                <section className="mb-6 rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Gentle next steps</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">What may help this week</h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {activeInsight.result.suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-gray-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-gray-200"
                      >
                        <span className="mr-2 font-semibold text-emerald-700 dark:text-emerald-300">{index + 1}.</span>
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-6 rounded-3xl border border-white bg-white p-6 shadow-xl shadow-sky-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                  <div className="mb-5">
                    <p className="text-sm font-medium text-sky-700 dark:text-sky-300">Mood-habit correlation</p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">How routines line up with mood</h2>
                  </div>

                  {activeInsight.result.habitCorrelations.length === 0 ? (
                    <p className="rounded-2xl bg-gray-50 p-4 text-gray-500 dark:bg-slate-950 dark:text-gray-400">
                      Add habits to see how they affect your mood.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left">
                        <thead>
                          <tr className="text-sm text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-2 font-medium">Habit</th>
                            <th className="px-4 py-2 font-medium">Mood when done</th>
                            <th className="px-4 py-2 font-medium">Mood when skipped</th>
                            <th className="px-4 py-2 font-medium">Logged days compared</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInsight.result.habitCorrelations.map((habit) => (
                            <tr key={habit.habitId} className="bg-gray-50 dark:bg-slate-950">
                              <td className="rounded-l-2xl px-4 py-4 font-semibold text-gray-900 dark:text-white">
                                <span className="mr-2" aria-hidden="true">{habit.emoji}</span>
                                {habit.habitName}
                              </td>
                              <td className="px-4 py-4 text-gray-700 dark:text-gray-200">
                                {habit.doneMood} · {formatScore(habit.moodWhenDone)}
                              </td>
                              <td className="px-4 py-4 text-gray-700 dark:text-gray-200">
                                {habit.skippedMood} · {formatScore(habit.moodWhenSkipped)}
                              </td>
                              <td className="rounded-r-2xl px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {habit.completedMoodDays} done / {habit.skippedMoodDays} skipped
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="mb-6 rounded-3xl border border-dashed border-emerald-300 bg-white p-8 text-center shadow-xl shadow-emerald-100/50 dark:border-emerald-400/30 dark:bg-slate-900 dark:shadow-none">
                <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">No AI insight yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-300">
                  Choose a time range above and ask for an analysis when you are ready.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Insight history</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Previous analyses</h2>
                </div>
                {historyLoading && <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>}
              </div>

              {history.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Generated insights will appear here over time.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((insight) => (
                    <details
                      key={insight.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950"
                    >
                      <summary className="cursor-pointer font-medium text-gray-900 dark:text-white">
                        Analysis from {formatInsightDate(insight.createdAt)} ({insight.rangeLabel})
                      </summary>
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-white/10">
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{insight.result.summary}</p>
                        <button
                          type="button"
                          onClick={() => setActiveInsight(insight)}
                          className="mt-4 rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                        >
                          View This Insight
                        </button>
                      </div>
                    </details>
                  ))}
                </div>
              )}
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
