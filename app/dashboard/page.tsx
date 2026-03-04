import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

export default function Dashboard() {
  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome back, Faria 👋</h1>
            <p className="text-2xl text-gray-600 mb-12">This is your personal dashboard.</p>

            <div className="bg-white rounded-3xl shadow-xl p-10">
              <h2 className="text-2xl font-semibold mb-6">Your Mood History</h2>
              <p className="text-gray-500">We will show your saved moods here soon...</p>
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