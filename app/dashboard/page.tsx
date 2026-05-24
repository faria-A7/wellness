'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

type MoodEntry = {
  id: number;
  mood: string;
  note: string | null;
  createdAt: string;
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

  const moods = [
    { emoji: '😍', label: 'Amazing' },
    { emoji: '🥳', label: 'Excited' },
    { emoji: '😊', label: 'Happy' },
    { emoji: '😑', label: 'Bored' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '😔', label: 'Sad' },
    { emoji: '😢', label: 'Depressed' },
    { emoji: '😠', label: 'Angry' },
    { emoji: '😤', label: 'Stressed' },
    { emoji: '😴', label: 'Tired' },
    { emoji: '🤒', label: 'Unwell' },
    { emoji: '🔥', label: 'Motivated' },
  ];

  const moodLookup = new Map(moods.map((item) => [item.label, item.emoji]));

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch('/api/log-mood', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data.moods)) {
        setHistory(data.moods);
      } else {
        setHistoryError(data.error || 'Failed to load mood history.');
      }
    } catch (error) {
      setHistoryError('Failed to load mood history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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
        await fetchHistory();
      } else {
        setMessage(`Error: ${data.error || 'Something went wrong'}`);
      }
    } catch (err) {
      setMessage('Failed to log mood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome back, {user?.firstName || 'User'} 👋
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10">
              Log how you're feeling today
            </p>

            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 mb-10">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                How are you feeling right now?
              </h2>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mb-8">
                {moods.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setSelectedMood(item.label)}
                    className={`text-4xl md:text-5xl p-4 rounded-2xl transition-all hover:scale-110 ${
                      selectedMood === item.label
                        ? 'bg-emerald-100 ring-4 ring-emerald-400'
                        : 'hover:bg-gray-100'
                    }`}
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Add a note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Felt bored because of long meeting..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-700 placeholder:text-gray-500 placeholder:font-normal"
                  rows={3}
                />
              </div>

              <button
                onClick={handleLogMood}
                disabled={loading}
                className={`bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium transition w-full md:w-auto ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'
                }`}
              >
                {loading ? 'Logging...' : 'Log Mood'}
              </button>

              {message && (
                <p className={`mt-6 text-center text-lg font-medium ${
                  message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {message}
                </p>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Your Recent Moods</h2>
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
                <ul className="divide-y divide-gray-200">
                  {history.map((entry) => {
                    const emoji = moodLookup.get(entry.mood) || '🙂';
                    const timestamp = new Date(entry.createdAt).toLocaleString();

                    return (
                      <li key={entry.id} className="flex items-start gap-4 py-4">
                        <div className="text-3xl" aria-hidden="true">
                          {emoji}
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
              )}
            </div>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}