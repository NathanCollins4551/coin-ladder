// src/app/(public)/account/signup/SignUpForm.tsx
'use client'; 

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { signup, verifyOtp } from '../login/actions'; 
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { checkDisplayNameAvailability } from '../login/actions'; 

export default function SignUpForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const step = searchParams.get('step');
  const email = searchParams.get('email');

  // State for the display name and its validation status
  const [displayName, setDisplayName] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (displayName.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    const handler = setTimeout(async () => {
        try {
          const available = await checkDisplayNameAvailability(displayName);
          setIsAvailable(available);
        } catch (e) {
          console.error("Error checking display name:", e);
          setIsAvailable(false); 
        } finally {
            setIsChecking(false);
        }
    }, 500);
    return () => clearTimeout(handler);
  }, [displayName]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningUp(true);
    setSignUpError(null);
    const formData = new FormData(event.currentTarget);
    const result = await signup(formData);
    if (result.success) {
        const email = formData.get('email') as string;
        const displayName = formData.get('display_name') as string;
        router.push(`${pathname}?step=2&email=${encodeURIComponent(email)}&displayName=${encodeURIComponent(displayName)}`);
    } else {
        setSignUpError(result.error || 'An unknown error occurred.');
    }
    setIsSigningUp(false);
  };

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

  if (step === '2') {
    const displayName = searchParams.get('displayName');
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
                <h2 className="text-3xl font-bold text-center text-white">
                Check your email
                </h2>
                <p className="text-center text-slate-400">
                    We've sent a 6-digit verification code to {email}.
                </p>
                
                {error && (
                <div className="p-3 text-sm text-red-300 bg-red-900 rounded-lg border border-red-700">
                    Verification failed: {decodeURIComponent(error)}
                </div>
                )}

                <form className="space-y-4" action={verifyOtp}>
                    <input type="hidden" name="email" value={email || ''} />
                    <input type="hidden" name="displayName" value={displayName || ''} />
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-slate-300">
                        Verification Code
                        </label>
                        <input
                        id="token"
                        name="token"
                        type="text"
                        required
                        placeholder="123456"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        autoComplete="off"
                        className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-white"
                        />
                    </div>
                    <div className="flex justify-center">
                        <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-lg font-medium transition bg-sky-600 text-white hover:bg-sky-700"
                        >
                        Verify
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
        <h2 className="text-3xl font-bold text-center text-white">
          Create a Coin Ladder Account
        </h2>
        
        {(error || signUpError) && (
          <div className="p-3 text-sm text-red-300 bg-red-900 rounded-lg border border-red-700">
            Sign up failed: {error ? decodeURIComponent(error) : signUpError}
          </div>
        )}

        {message && (
          <div className="p-3 text-sm text-green-300 bg-green-900 rounded-lg border border-green-700">
            {decodeURIComponent(message)}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignUp}> 
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-slate-300">
              Unique Display Name
            </label>
            <input
              id="display_name"
              name="display_name"
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
              disabled={isChecking || isAvailable === false || displayName.length < 3 || isSigningUp}
              className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                isChecking || isAvailable === false || displayName.length < 3 || isSigningUp
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {isSigningUp ? 'Signing up...' : 'Sign Up'}
            </button>
          </div>
        </form>
        
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