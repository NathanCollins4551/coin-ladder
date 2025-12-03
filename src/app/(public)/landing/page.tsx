// src/app/(public)/landing/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-pink-500">
        Coin Ladder 🪜
      </h1>
      <p className="text-xl text-slate-300 mb-12">
        Start trading crypto in our risk-free simulator.
      </p>

      <div className="flex space-x-6">
        {/* Log In Option: Navigates to /account/login */}
        <Link 
          href="/account/login" 
          className="px-8 py-3 bg-sky-600 text-white rounded-lg text-lg font-semibold shadow-lg hover:bg-sky-700 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Log In
        </Link>

        {/* Sign Up Option: Navigates to /account/signup */}
        <Link 
          href="/account/signup" 
          className="px-8 py-3 border-2 border-sky-600 text-sky-500 rounded-lg text-lg font-semibold hover:bg-sky-900 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}