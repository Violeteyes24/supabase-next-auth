import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link';

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user }, error } = await supabase.auth.getUser();

  const mainStyle = {
    backgroundImage: "url('/forest-bg.jpeg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  };

  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  };

  const contentStyle = {
    position: 'relative',
    zIndex: 2,
  };

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4" style={mainStyle}>
        <div style={overlayStyle}></div>
        <div className="bg-white/10 p-8 rounded-lg backdrop-blur-lg shadow-xl max-w-md w-full" style={contentStyle}>
          <h1 className="text-3xl font-bold text-white mb-4 text-center">Welcome to Mental Help</h1>
          <p className="text-green-100 mb-6 text-center">Your journey to mental wellness begins here</p>
          <Link 
            href="/login" 
            className="w-full inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center shadow-lg"
          >
            Sign In to Continue
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4" style={mainStyle}>
      <div style={overlayStyle}></div>
      <div className="bg-white/10 p-8 rounded-lg backdrop-blur-lg shadow-xl text-center max-w-md w-full" style={contentStyle}>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back!</h1>
        <p className="text-green-100 mb-6">Your mental wellness journey continues</p>
        <div className="space-y-4">
          <Link 
            href="/dashboard" 
            className="w-full inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Go to Dashboard
          </Link>
          <Link 
            href="/journal" 
            className="w-full inline-block bg-green-400/80 hover:bg-green-500/80 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
          >
            My Journal
          </Link>
          <Link 
            href="/resources" 
            className="w-full inline-block bg-green-300/60 hover:bg-green-400/60 text-green-900 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Wellness Resources
          </Link>
        </div>
      </div>
    </main>
  )
}