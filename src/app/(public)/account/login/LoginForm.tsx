// src/app/(public)/account/login/LoginForm.tsx
'use client'; 

import { useSearchParams } from 'next/navigation';
import { login } from './actions'; 
import Link from 'next/link';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error') ? decodeURIComponent(searchParams.get('error')!) : null;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
        <h2 className="text-3xl font-bold text-center text-white">
          Sign in to Coin Ladder
        </h2>
        
        {/* Display Error Message if present */}
        {errorMessage && (
          <div className="p-3 text-sm text-red-300 bg-red-900 rounded-lg border border-red-700">
            Authentication failed: {errorMessage}
          </div>
        )}

        {/* Form uses the 'login' Server Action */}
        <form className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-white"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-white"
            />
          </div>
          
          <div className="flex justify-center">
            {/* Login Button - uses formAction to call the login Server Action */}
            <button 
              formAction={login}
              className="w-full py-2 px-4 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition"
            >
              Log In
            </button>
            
            {/* REMOVED: The unnecessary 'Sign Up' button */}
          </div>
        </form>
        
        {/* Sign Up Link: This remains to direct users to the dedicated sign-up page */}
        <div className="text-center text-sm">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link href="/account/signup" className="font-medium text-sky-500 hover:text-sky-400">
              Sign Up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}