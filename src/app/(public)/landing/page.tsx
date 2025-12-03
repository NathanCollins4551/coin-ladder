// src/app/(public)/landing/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-5xl font-extrabold mb-4 text-gray-900">
        Coin Ladder 🪜
      </h1>
      <p className="text-xl text-gray-600 mb-12">
        Start trading crypto in our risk-free simulator.
      </p>

      <div className="flex space-x-6">
        {/* Log In Option: Navigates to /account/login */}
        <Link 
          href="/account/login" 
          className="px-8 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold shadow-lg hover:bg-green-700 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Log In
        </Link>

        {/* Sign Up Option: Navigates to /account/signup */}
        <Link 
          href="/account/signup" 
          className="px-8 py-3 border-2 border-green-600 text-green-600 rounded-lg text-lg font-semibold hover:bg-green-50 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}