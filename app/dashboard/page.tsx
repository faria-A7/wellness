'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useState } from 'react';

export default function Dashboard() {
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [message, setMessage] = useState<string>('');

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

  const handleLogMood = () => {
    if (!selectedMood) {
      setMessage('Please select a mood first!');
      return;
    }

    // For now: just show success message (no DB yet)
    setMessage(`Mood logged: ${selectedMood}${note ? ` - "${note}"` : ''}`);
    
    // Reset form
    setSelectedMood('');
    setNote('');
  };

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome back 👋
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10">
              Log how you're feeling today
            </p>

            {/* Mood Logging Form */}
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
                  className="w-full p-3 text-gray-300 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:placeholder:text-gray-400 placeholder:font-normal"
                  rows={3}
                />
              </div>

              <button
                onClick={handleLogMood}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition w-full md:w-auto"
              >
                Log Mood
              </button>

              {message && (
                <p className="mt-6 text-center text-lg font-medium text-emerald-700">
                  {message}
                </p>
              )}
            </div>

            {/* Placeholder for future history */}
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
              <h2 className="text-2xl text-black font-semibold mb-6">Your Recent Moods</h2>
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