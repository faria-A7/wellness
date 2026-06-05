'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MOODS, getMoodMeta } from '@/lib/moods';

type MoodEntry = {
  id: number;
  mood: string;
  note: string | null;
  createdAt: string;
};

type AiInsightPreview = {
  id: number;
  rangeLabel: string;
  createdAt: string;
  result: {
    mainInsight?: string;
    summary?: string;
  };
};

const HISTORY_PAGE_SIZE = 5;
const NOTE_WORD_LIMIT = 200;

const countWords = (value: string) => {
  return value.trim().split(/\s+/).filter(Boolean).length;
};

const limitWords = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= NOTE_WORD_LIMIT) {
    return value;
  }

  return words.slice(0, NOTE_WORD_LIMIT).join(' ');
};

export default function Dashboard() {
  const { user } = useUser();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string>('');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editNote, setEditNote] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<MoodEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [latestInsight, setLatestInsight] = useState<AiInsightPreview | null>(null);
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const noteWordCount = countWords(note);

  const fetchHistory = useCallback(async (page: number) => {
    if (!user) {
      setHistory([]);
      setHistoryTotal(0);
      setHistoryTotalPages(1);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(HISTORY_PAGE_SIZE),
      });
      const response = await fetch(`/api/log-mood?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data.moods)) {
        setHistory(data.moods);
        setHistoryTotal(data.pagination?.total ?? data.moods.length);
        setHistoryTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        setHistoryError(data.error || 'Failed to load mood history.');
      }
    } catch {
      setHistoryError('Failed to load mood history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchHistory(historyPage);
  }, [fetchHistory, historyPage]);

  useEffect(() => {
    if (!user) {
      setLatestInsight(null);
      return;
    }

    const fetchLatestInsight = async () => {
      setInsightLoading(true);

      try {
        const response = await fetch('/api/ai-insights?limit=1', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();

        if (response.ok && Array.isArray(data.insights)) {
          setLatestInsight(data.insights[0] ?? null);
        }
      } catch {
        setLatestInsight(null);
      } finally {
        setInsightLoading(false);
      }
    };

    void fetchLatestInsight();
  }, [user]);

  const handleLogMood = async () => {
    if (!selectedMood) {
      setMessage('Please select a mood first!');
      return;
    }

    if (!user) {
      setMessage('You must be logged in to log a mood.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/log-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mood: selectedMood,
          note: note.trim() || null,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Mood logged successfully: ${selectedMood}${note ? ` - "${note}"` : ''}`);
        setSelectedMood('');
        setNote('');

        if (historyPage === 1) {
          await fetchHistory(1);
        } else {
          setHistoryPage(1);
        }
      } else {
        setMessage(`Error: ${data.error || 'Something went wrong'}`);
      }
    } catch {
      setMessage('Failed to log mood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (entry: MoodEntry) => {
    setEditingEntry(entry);
    setEditNote(entry.note ?? '');
    setMessage('');
  };

  const closeEditModal = () => {
    if (editLoading) return;

    setEditingEntry(null);
    setEditNote('');
  };

  const handleUpdateNote = async () => {
    if (!editingEntry) return;

    setEditLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/log-mood', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingEntry.id,
          note: editNote.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Mood note updated successfully.');
        setEditingEntry(null);
        setEditNote('');
        await fetchHistory(historyPage);
      } else {
        setMessage(`Error: ${data.error || 'Could not update that note'}`);
      }
    } catch {
      setMessage('Failed to update mood note. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = (entry: MoodEntry) => {
    setDeleteTarget(entry);
    setMessage('');
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;

    setDeleteTarget(null);
  };

  const handleDeleteLog = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/log-mood', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      const data = await response.json();

      if (response.ok) {
        const nextTotal = Math.max(historyTotal - 1, 0);
        const nextTotalPages = Math.max(Math.ceil(nextTotal / HISTORY_PAGE_SIZE), 1);
        const nextPage = Math.min(historyPage, nextTotalPages);

        setMessage('Mood log deleted successfully.');
        setDeleteTarget(null);

        if (nextPage !== historyPage) {
          setHistoryPage(nextPage);
        } else {
          await fetchHistory(nextPage);
        }
      } else {
        setMessage(`Error: ${data.error || 'Could not delete that log'}`);
      }
    } catch {
      setMessage('Failed to delete mood log. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-gray-950 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-950 mb-3 dark:text-white">
                  Welcome back, {user?.firstName || 'User'} 👋
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                  Log today&apos;s mood quickly, then review the recent notes you have captured.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/habits"
                  className="self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/20 md:self-auto"
                >
                  Habits
                </Link>
                <Link
                  href="/insights"
                  className="self-start rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/20 md:self-auto"
                >
                  AI Insights
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="self-start rounded-2xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-800 md:self-auto"
                >
                  Settings
                </Link>
                <Link
                  href="/dashboard/statistics"
                  className="self-start md:self-auto bg-gray-950 text-white px-5 py-3 rounded-2xl font-medium transition hover:bg-gray-800 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400"
                >
                  View Mood Statistics
                </Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_0.65fr] gap-6 mb-6">
              <section className="bg-white rounded-3xl shadow-xl shadow-emerald-100/60 border border-white p-6 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
                  How are you feeling right now?
                </h2>
                <p className="text-gray-500 mb-6 dark:text-gray-300">Choose a mood and add a little context if you want.</p>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-7">
                  {MOODS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setSelectedMood(item.label)}
                      className={`text-4xl md:text-5xl p-4 rounded-2xl transition-all hover:-translate-y-1 ${
                        selectedMood === item.label
                          ? 'bg-emerald-100 ring-4 ring-emerald-400 shadow-md dark:bg-emerald-500/20'
                          : 'bg-gray-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700'
                      }`}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>

                <div className="mb-5">
                  <label className="block text-gray-700 font-medium mb-2 dark:text-gray-200">
                    Add a note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(limitWords(e.target.value))}
                    placeholder="e.g. Felt calmer after a walk..."
                    className="w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-700 placeholder:text-gray-400 bg-gray-50 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100 dark:placeholder:text-gray-500"
                    rows={3}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-400 dark:text-gray-500">
                      Keep it brief: up to {NOTE_WORD_LIMIT} words.
                    </span>
                    <span className={`font-medium ${
                      noteWordCount >= NOTE_WORD_LIMIT
                        ? 'text-amber-600 dark:text-amber-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {noteWordCount}/{NOTE_WORD_LIMIT} words
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogMood}
                  disabled={loading}
                  className={`bg-emerald-600 text-white px-8 py-3 rounded-2xl font-medium transition w-full ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700 hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? 'Logging...' : 'Log Mood'}
                </button>

                {message && (
                  <p className={`mt-5 text-center text-base font-medium ${
                    message.includes('Error') || message.includes('Failed') ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {message}
                  </p>
                )}
              </section>

              <div className="grid gap-6">
                <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-sky-100/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sky-700 dark:text-sky-300">AI Mood Insight</p>
                      <h2 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
                        {latestInsight ? 'Latest reflection' : 'Ask for a deeper read'}
                      </h2>
                    </div>
                    <span className="rounded-2xl bg-sky-50 px-3 py-2 text-2xl dark:bg-sky-400/10" aria-hidden="true">
                      ✨
                    </span>
                  </div>

                  {insightLoading ? (
                    <p className="text-gray-500 dark:text-gray-400">Checking your latest insight...</p>
                  ) : latestInsight ? (
                    <p className="line-clamp-4 leading-7 text-gray-600 dark:text-gray-300">
                      {latestInsight.result.summary || latestInsight.result.mainInsight}
                    </p>
                  ) : (
                    <p className="leading-7 text-gray-600 dark:text-gray-300">
                      Generate an AI reflection from your mood notes and habits when you want a more personal pattern check.
                    </p>
                  )}

                  <Link
                    href="/insights"
                    className="mt-6 inline-flex w-full justify-center rounded-2xl bg-sky-600 px-5 py-3 font-medium text-white transition hover:bg-sky-700 dark:bg-sky-400 dark:text-gray-950 dark:hover:bg-sky-300"
                  >
                    View Full Insights
                  </Link>
                </section>

                <section className="bg-gray-950 text-white rounded-3xl shadow-xl shadow-sky-100/70 overflow-hidden">
                  <div className="h-full p-6 md:p-8 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.28),transparent_40%)] flex flex-col justify-between gap-8">
                    <div>
                      <p className="text-emerald-200 font-medium mb-3">Mood Statistics</p>
                      <h2 className="text-3xl font-bold mb-4">See the bigger picture.</h2>
                      <p className="text-emerald-50 leading-7">
                        Open your statistics page for average mood score, weekly and monthly trend charts, best-day insights, and your most common moods.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/statistics"
                      className="inline-flex justify-center rounded-2xl bg-white text-gray-950 px-5 py-3 font-medium transition hover:bg-emerald-50"
                    >
                      Open Statistics
                    </Link>
                  </div>
                </section>
              </div>
            </div>

            <section className="bg-white rounded-3xl shadow-xl shadow-sky-100/50 border border-white p-6 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">Your Mood History</h2>
                {!historyLoading && !historyError && historyTotal > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {historyPage} of {historyTotalPages} · {historyTotal} total
                  </span>
                )}
              </div>
              {historyLoading && (
                <p className="text-gray-500 dark:text-gray-400">Loading your mood history...</p>
              )}

              {!historyLoading && historyError && (
                <p className="text-red-600 dark:text-red-400">{historyError}</p>
              )}

              {!historyLoading && !historyError && history.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">No moods logged yet. Log your first one above.</p>
              )}

              {!historyLoading && !historyError && history.length > 0 && (
                <>
                  <ul className="divide-y divide-gray-200 dark:divide-white/10">
                    {history.map((entry) => {
                      const mood = getMoodMeta(entry.mood);
                      const timestamp = new Date(entry.createdAt).toLocaleString();

                      return (
                        <li key={entry.id} className="flex flex-col sm:flex-row sm:items-start gap-4 py-5">
                          <div className="text-3xl" aria-hidden="true">
                            {mood.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">{entry.mood}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{timestamp}</span>
                            </div>
                            {entry.note ? (
                              <p className="text-gray-700 mt-1 dark:text-gray-300">{entry.note}</p>
                            ) : (
                              <p className="text-gray-400 mt-1 italic dark:text-gray-500">No note</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:pt-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/20"
                            >
                              Edit Note
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(entry)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
                            >
                              Delete Log
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}-
                      {Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.max(page - 1, 1))}
                        disabled={historyPage === 1}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.min(page + 1, historyTotalPages))}
                        disabled={historyPage >= historyTotalPages}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          {editingEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-note-title"
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-5">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">Update previous thought</p>
                  <h2 id="edit-note-title" className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                    Edit Note
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {editingEntry.mood} logged on {new Date(editingEntry.createdAt).toLocaleString()}
                  </p>
                </div>

                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="edit-note">
                  Note
                </label>
                <textarea
                  id="edit-note"
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder="Add what you want to remember about this mood..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-gray-100 dark:placeholder:text-gray-500"
                  rows={5}
                />

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={editLoading}
                    className="rounded-2xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateNote}
                    disabled={editLoading}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editLoading ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-log-title"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-6">
                  <p className="text-sm font-medium text-red-600 dark:text-red-300">This cannot be undone</p>
                  <h2 id="delete-log-title" className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
                    Delete this mood log?
                  </h2>
                  <p className="mt-3 text-gray-600 dark:text-gray-300">
                    You are about to remove the {deleteTarget.mood} entry from{' '}
                    {new Date(deleteTarget.createdAt).toLocaleString()}.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950">
                  {deleteTarget.note ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{deleteTarget.note}</p>
                  ) : (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">No note</p>
                  )}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleteLoading}
                    className="rounded-2xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-slate-800"
                  >
                    Keep Log
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteLog}
                    disabled={deleteLoading}
                    className="rounded-2xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Log'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
