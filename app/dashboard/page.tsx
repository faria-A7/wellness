'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useUser();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
              <p className="text-gray-500">Your logged moods will appear here soon...</p>
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