'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendPoint = {
  date: string;
  label: string;
  score: number | null;
  mood: string;
  count: number;
};

type MoodStats = {
  totalLogged: number;
  averageScore: number | null;
  averageMood: string;
  averageScoreThisMonth: number | null;
  averageMoodThisMonth: string;
  mostCommonMood: {
    mood: string;
    emoji: string;
    count: number;
    percentage: number;
  } | null;
  bestDayThisWeek: {
    day: string;
    score: number;
    mood: string;
    count: number;
  } | null;
  weeklyTrend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  distribution: Array<{
    mood: string;
    emoji: string;
    count: number;
    percentage: number;
  }>;
};

const formatScore = (score: number | null) => {
  return score === null ? '--' : score.toFixed(1);
};

export default function MoodStatisticsPage() {
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string>('');
  const [trendRange, setTrendRange] = useState<'weekly' | 'monthly'>('weekly');

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');

    try {
      const response = await fetch('/api/mood-stats', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        setStatsError(data.error || 'Failed to load mood statistics.');
      }
    } catch {
      setStatsError('Failed to load mood statistics. Please try again.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return trendRange === 'weekly' ? stats.weeklyTrend : stats.monthlyTrend;
  }, [stats, trendRange]);

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-gray-950 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <Link href="/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                  Go back to dashboard
                </Link>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-950 mt-3 mb-3 dark:text-white">
                  Your Mood Statistics
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                  Review your mood patterns, averages, and weekly highlights.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/settings"
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-800"
                >
                  Settings
                </Link>
                <span className="self-start md:self-auto px-4 py-2 rounded-full bg-gray-950 text-emerald-50 text-sm font-medium dark:bg-emerald-500 dark:text-gray-950">
                  Score range 1-5
                </span>
              </div>
            </div>

            {statsLoading && (
              <section className="bg-white rounded-3xl shadow-xl shadow-emerald-100/60 border border-white p-8 dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
                <p className="text-gray-500 dark:text-gray-400">Loading your mood statistics...</p>
              </section>
            )}

            {!statsLoading && statsError && (
              <section className="bg-white rounded-3xl shadow-xl shadow-red-100/60 border border-white p-8 dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
                <p className="text-red-600 dark:text-red-400">{statsError}</p>
              </section>
            )}

            {!statsLoading && !statsError && stats && (
              <>
                <section className="bg-gray-950 text-white rounded-3xl shadow-xl shadow-sky-100/70 overflow-hidden mb-6">
                  <div className="p-6 md:p-8 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.28),_transparent_40%)]">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
                        <p className="text-sm text-emerald-100">Total moods logged</p>
                        <p className="text-4xl font-bold mt-3">{stats.totalLogged}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
                        <p className="text-sm text-emerald-100">Average mood score</p>
                        <p className="text-4xl font-bold mt-3">{formatScore(stats.averageScore)}</p>
                        <p className="text-sm text-emerald-100 mt-1">{stats.averageMood}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
                        <p className="text-sm text-emerald-100">Average this month</p>
                        <p className="text-3xl font-bold mt-3">{stats.averageMoodThisMonth}</p>
                        <p className="text-sm text-emerald-100 mt-1">
                          {formatScore(stats.averageScoreThisMonth)} avg score
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
                        <p className="text-sm text-emerald-100">Most frequent mood</p>
                        <p className="text-3xl font-bold mt-3">
                          {stats.mostCommonMood
                            ? `${stats.mostCommonMood.emoji} ${stats.mostCommonMood.mood}`
                            : 'No data'}
                        </p>
                        <p className="text-sm text-emerald-100 mt-1">
                          {stats.mostCommonMood
                            ? `${stats.mostCommonMood.count} times · ${stats.mostCommonMood.percentage}%`
                            : 'Log a mood to begin'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6 mb-6">
                  <section className="bg-white rounded-3xl shadow-xl shadow-sky-100/60 border border-white p-6 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">Mood trend</h2>
                        <p className="text-gray-500 mt-1 dark:text-gray-400">Average daily mood score over time.</p>
                      </div>
                      <div className="inline-flex rounded-2xl bg-gray-100 p-1 dark:bg-slate-950">
                        <button
                          type="button"
                          onClick={() => setTrendRange('weekly')}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                            trendRange === 'weekly' ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Weekly
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendRange('monthly')}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                            trendRange === 'monthly' ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Monthly
                        </button>
                      </div>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="moodTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                          <YAxis
                            domain={[1, 5]}
                            ticks={[1, 2, 3, 4, 5]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 16,
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
                            }}
                            formatter={(value) => [`${value}`, 'Average score']}
                            labelFormatter={(_, payload) => {
                              const point = payload?.[0]?.payload as TrendPoint | undefined;
                              return point ? `${point.label} · ${point.mood} · ${point.count} logged` : '';
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#059669"
                            strokeWidth={3}
                            fill="url(#moodTrend)"
                            connectNulls
                            dot={{ r: 4, fill: '#ffffff', stroke: '#059669', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-white p-6 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                    <p className="text-sm font-medium text-emerald-700 mb-2 dark:text-emerald-300">Weekly highlight</p>
                    <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">
                      {stats.bestDayThisWeek
                        ? `${stats.bestDayThisWeek.day} was your best day`
                        : 'No moods logged this week yet'}
                    </h2>
                    <p className="text-gray-500 mt-3 dark:text-gray-400">
                      {stats.bestDayThisWeek
                        ? `${stats.bestDayThisWeek.mood} mood average from ${stats.bestDayThisWeek.count} log${stats.bestDayThisWeek.count === 1 ? '' : 's'}.`
                        : 'Your best-day insight will appear once you log a mood this week.'}
                    </p>
                    <div className="mt-8 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10">
                      <p className="text-sm text-emerald-700 font-medium dark:text-emerald-300">Quick read</p>
                      <p className="text-gray-700 mt-2 dark:text-gray-300">
                        Your monthly average is currently <span className="font-semibold">{stats.averageMoodThisMonth}</span>.
                      </p>
                    </div>
                  </section>
                </div>

                <section className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-white p-6 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none md:p-8">
                  <h2 className="text-2xl font-semibold text-gray-950 mb-5 dark:text-white">Mood mix</h2>
                  {stats.distribution.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400">Your mood mix will show up once you start logging moods.</p>
                  )}
                  {stats.distribution.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
                      {stats.distribution.map((item) => (
                        <div key={item.mood}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {item.emoji} {item.mood}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {item.count} · {item.percentage}%
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-gray-100 overflow-hidden dark:bg-slate-950">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
