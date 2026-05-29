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

const HISTORY_PAGE_SIZE = 5;

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

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-950 mb-3">
                  Welcome back, {user?.firstName || 'User'} 👋
                </h1>
                <p className="text-lg md:text-xl text-gray-600">
                  Log today&apos;s mood quickly, then review the recent notes you have captured.
                </p>
              </div>
              <Link
                href="/dashboard/statistics"
                className="self-start md:self-auto bg-gray-950 text-white px-5 py-3 rounded-2xl font-medium transition hover:bg-gray-800"
              >
                View Mood Statistics
              </Link>
            </div>

            <div className="grid lg:grid-cols-[1fr_0.65fr] gap-6 mb-6">
              <section className="bg-white rounded-3xl shadow-xl shadow-emerald-100/60 border border-white p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                  How are you feeling right now?
                </h2>
                <p className="text-gray-500 mb-6">Choose a mood and add a little context if you want.</p>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-7">
                  {MOODS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setSelectedMood(item.label)}
                      className={`text-4xl md:text-5xl p-4 rounded-2xl transition-all hover:-translate-y-1 ${
                        selectedMood === item.label
                          ? 'bg-emerald-100 ring-4 ring-emerald-400 shadow-md'
                          : 'bg-gray-50 hover:bg-emerald-50'
                      }`}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>

                <div className="mb-5">
                  <label className="block text-gray-700 font-medium mb-2">
                    Add a note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Felt calmer after a walk..."
                    className="w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-700 placeholder:text-gray-400 bg-gray-50"
                    rows={3}
                  />
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
                    message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {message}
                  </p>
                )}
              </section>

              <section className="bg-gray-950 text-white rounded-3xl shadow-xl shadow-sky-100/70 overflow-hidden">
                <div className="h-full p-6 md:p-8 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.28),_transparent_40%)] flex flex-col justify-between gap-8">
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

            <section className="bg-white rounded-3xl shadow-xl shadow-sky-100/50 border border-white p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-gray-950">Your Mood History</h2>
                {!historyLoading && !historyError && historyTotal > 0 && (
                  <span className="text-sm text-gray-500">
                    Page {historyPage} of {historyTotalPages} · {historyTotal} total
                  </span>
                )}
              </div>
              {historyLoading && (
                <p className="text-gray-500">Loading your mood history...</p>
              )}

              {!historyLoading && historyError && (
                <p className="text-red-600">{historyError}</p>
              )}

              {!historyLoading && !historyError && history.length === 0 && (
                <p className="text-gray-500">No moods logged yet. Log your first one above.</p>
              )}

              {!historyLoading && !historyError && history.length > 0 && (
                <>
                  <ul className="divide-y divide-gray-200">
                    {history.map((entry) => {
                      const mood = getMoodMeta(entry.mood);
                      const timestamp = new Date(entry.createdAt).toLocaleString();

                      return (
                        <li key={entry.id} className="flex items-start gap-4 py-4">
                          <div className="text-3xl" aria-hidden="true">
                            {mood.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-lg font-semibold text-gray-900">{entry.mood}</span>
                              <span className="text-sm text-gray-500">{timestamp}</span>
                            </div>
                            {entry.note ? (
                              <p className="text-gray-700 mt-1">{entry.note}</p>
                            ) : (
                              <p className="text-gray-400 mt-1 italic">No note</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6">
                    <p className="text-sm text-gray-500">
                      Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}-
                      {Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.max(page - 1, 1))}
                        disabled={historyPage === 1}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.min(page + 1, historyTotalPages))}
                        disabled={historyPage >= historyTotalPages}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
