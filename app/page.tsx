'use client';

import { useState } from 'react';

export default function Home() {
  const [mood, setMood] = useState<string>('');

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-emerald-700">Wellness</h1>
    
          {/* Simple placeholder – we'll replace with Clerk's UserButton later */}
          <div className="flex gap-6">
            <a href="/sign-in" className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition">Sign In</a>
            <a href="/sign-up" className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center pt-16 pb-12 px-6">
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Small daily habits.<br />Big life changes.
        </h2>
        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          Track your mood, build habits, and become the best version of yourself.
        </p>
        <p className="text-emerald-700 font-medium text-lg md:text-xl">
          Hey, Homo Sapiens! 👋 Welcome to your personal wellness journey
        </p>
      </div>

      {/* Quick Mood Tracker */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <h3 className="text-2xl md:text-3xl font-semibold text-center mb-8 text-gray-800">
            How are you feeling right now?
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-6 justify-items-center">
            {moods.map((item) => (
              <button
                key={item.label}
                onClick={() => setMood(item.label)}
                className={`text-5xl md:text-6xl p-4 md:p-6 rounded-2xl transition-all hover:scale-110 active:scale-95 ${
                  mood === item.label
                    ? 'bg-emerald-100 ring-4 ring-emerald-400 shadow-md'
                    : 'hover:bg-gray-100'
                }`}
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>

          {mood && (
            <div className="text-center mt-10 text-xl md:text-2xl font-medium text-emerald-700">
              You chose: <span className="text-3xl md:text-4xl font-bold">{mood}</span>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-8 text-gray-500 text-sm border-t">
        Built by Faria • Using Next.js + PostgreSQL for full-stack development • March 2026
      </footer>
    </main>
  );
}