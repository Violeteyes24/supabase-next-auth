import Image from 'next/image'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link';

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user }, error } = await supabase.auth.getUser();

  console.log("User:", user); // Logs to the terminal
  console.log("Error:", error);

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-800 to-emerald-600 flex flex-col items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md text-center shadow-2xl border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-6">Mind & Wellness</h1>
          <p className="text-white/80 mb-8">Your journey to better mental health begins here. Please log in to access your personalized dashboard.</p>
          <Link 
            href={'/login'} 
            className="px-8 py-3 bg-white text-green-700 rounded-lg font-bold hover:bg-green-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Log In
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-green-50 dark:bg-gray-900">
      {/* Header with user info */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="font-bold text-xl text-green-600 dark:text-green-400">Mind & Wellness</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-semibold">
                {user.email ? user.email[0].toUpperCase() : '?'}
              </div>
              <span className="hidden sm:block text-gray-700 dark:text-gray-300">
                {user.email || user.id}
              </span>
            </div>
            <Link 
              href="/api/auth/signout" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome section */}
        <section className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Welcome to your wellness space</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            Every step you take here is a step toward better mental health. Your personalized dashboard is ready to support your journey.
          </p>
        </section>

        {/* Dashboard access card */}
        <section className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl overflow-hidden mb-12">
          <div className="md:flex">
            <div className="p-8 text-white md:w-2/3">
              <h2 className="text-2xl font-bold mb-4">Your Wellness Dashboard</h2>
              <p className="mb-6 opacity-90">
                Track your progress, access personalized resources, and continue your mental wellness journey.
              </p>
              <Link 
                href="/dashboard/counselor" 
                className="inline-block px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
            <div className="hidden md:block md:w-1/3 relative">
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Quick action cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg inline-block mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Daily Check-in</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Record how you're feeling today and track your mood patterns.</p>
            <Link href="/check-in" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              Start Check-in →
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg inline-block mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Wellness Activities</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Discover activities designed to improve your mental wellbeing.</p>
            <Link href="/activities" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              Explore Activities →
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg inline-block mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Progress Insights</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Review your wellness journey and see how far you've come.</p>
            <Link href="/progress" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              View Progress →
            </Link>
          </div>
        </section>

        {/* Resources section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Mental Wellness Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Mental Health Articles</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Expert-written content to help you understand mental health concepts.</p>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Guided Meditations</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Audio sessions to help reduce stress and improve mindfulness.</p>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Support Communities</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Connect with others who understand what you're going through.</p>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Crisis Resources</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Immediate help resources if you or someone you know is in crisis.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-gray-500 dark:text-gray-400">© 2025 Mind & Wellness. All rights reserved.</p>
            <div className="mt-4 md:mt-0">
              <Link href="/help" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mx-2">
                Help
              </Link>
              <Link href="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mx-2">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mx-2">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}