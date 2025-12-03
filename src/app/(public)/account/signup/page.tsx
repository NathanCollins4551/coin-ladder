// src/app/(public)/account/signup/page.tsx
'use client'; 

import { useSearchParams } from 'next/navigation';
import { signup } from '../login/actions'; 
import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
// Import the new Server Action you will create
import { checkDisplayNameAvailability } from '../login/actions'; 

// Debounce utility to limit the rate of API calls
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  // State for the display name and its validation status
  const [displayName, setDisplayName] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, startTransition] = useTransition();

  // Debounced function to call the server action
  // The 'useCallback' hook is not strictly necessary here, but good practice for debounced functions.
  const checkAvailability = useEffect(() => {
    if (displayName.length < 3) {
      setIsAvailable(null);
      return;
    }

    const debouncedCheck = debounce(async (name: string) => {
      startTransition(async () => {
        try {
          // This calls your new server action
          const available = await checkDisplayNameAvailability(name);
          setIsAvailable(available);
        } catch (e) {
          // Handle potential network or server errors, treat as unavailable or error state
          console.error("Error checking display name:", e);
          setIsAvailable(false); 
        }
      });
    }, 500); // 500ms delay

    debouncedCheck(displayName);
  }, [displayName]); // Re-run effect when displayName changes

  // Helper function to render the status message
  const renderAvailabilityStatus = () => {
    if (displayName.length === 0) return null;

    if (displayName.length < 3) {
      return (
        <p className="text-xs text-yellow-400 mt-1">
          Must be at least 3 characters.
        </p>
      );
    }

    if (isChecking) {
      return (
        <p className="text-xs text-slate-400 mt-1">
          Checking availability...
        </p>
      );
    }

    if (isAvailable === true) {
      return (
        <p className="text-xs text-green-400 mt-1 flex items-center">
          ✅ Available!
        </p>
      );
    }
    
    if (isAvailable === false) {
      return (
        <p className="text-xs text-red-400 mt-1 flex items-center">
          ❌ Already taken.
        </p>
      );
    }

    return null;
  };


  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
        <h2 className="text-3xl font-bold text-center text-white">
          Create a Coin Ladder Account
        </h2>
        
        {/* Display Error Message */}
        {error && (
          <div className="p-3 text-sm text-red-300 bg-red-900 rounded-lg border border-red-700">
            Sign up failed: {decodeURIComponent(error)}
          </div>
        )}

        {/* Display Success Message */}
        {message && (
          <div className="p-3 text-sm text-green-300 bg-green-900 rounded-lg border border-green-700">
            {decodeURIComponent(message)}
          </div>
        )}

        {/* Form uses the 'signup' Server Action */}
        <form className="space-y-4" action={signup}> 

          {/* Display Name Input (NEW) */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-slate-300">
              Unique Display Name
            </label>
            <input
              id="display_name"
              name="display_name" // **Crucial: Must match the name used in the 'signup' action**
              type="text"
              required
              minLength={3}
              placeholder="e.g., TraderJoe123"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-white"
            />
            {renderAvailabilityStatus()}
          </div>
          
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
            <button 
              type="submit" 
              // Disable button if checking or if name is invalid/unavailable
              disabled={isChecking || isAvailable === false || displayName.length < 3}
              className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                isChecking || isAvailable === false || displayName.length < 3 
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              Sign Up
            </button>
          </div>
        </form>
        
        {/* Log In Link */}
        <div className="text-center text-sm">
          <p className="text-slate-400">
            Already have an account?{' '}
            <Link href="/account/login" className="font-medium text-sky-500 hover:text-sky-400">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}