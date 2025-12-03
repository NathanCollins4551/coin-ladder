// src/app/(public)/account/login/page.tsx
'use client'; 

import { useSearchParams } from 'next/navigation';
// Import only the login action, but the file still exists for the signup page.
import { login } from './actions'; 
import Link from 'next/link';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error') ? decodeURIComponent(searchParams.get('error')!) : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Sign in to Coin Ladder
        </h2>
        
        {/* Display Error Message if present */}
        {errorMessage && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300">
            Authentication failed: {errorMessage}
          </div>
        )}

        {/* Form uses the 'login' Server Action */}
        <form className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex justify-center">
            {/* Login Button - uses formAction to call the login Server Action */}
            <button 
              formAction={login}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              Log In
            </button>
            
            {/* REMOVED: The unnecessary 'Sign Up' button */}
          </div>
        </form>
        
        {/* Sign Up Link: This remains to direct users to the dedicated sign-up page */}
        <div className="text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/account/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign Up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}