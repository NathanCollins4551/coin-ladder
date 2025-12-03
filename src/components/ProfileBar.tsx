// src/components/ProfileBar.tsx
'use client'; 
import { logout } from '@/app/(public)/account/login/actions';

interface ProfileBarProps {
    username: string;
    balance: number;
}

// Set a default for balance as a final safety measure against the toLocaleString error
export const ProfileBar = ({ username, balance = 0 }: ProfileBarProps) => {

    const displayBalance = balance; 

    return (
        <header className="flex justify-end items-center h-16 bg-slate-900 shadow-md px-6 border-b border-slate-800">
            <div className="flex items-center space-x-4">
                {/* Username */}
                <span className="text-sm font-semibold text-slate-300 hidden sm:inline">
                    {username}
                </span>

                {/* Display Balance */}
                <div className="px-3 py-1 bg-emerald-900 text-emerald-300 rounded-full text-sm font-bold">
                    ${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>

                {/* Logout Button: Uses a form and Server Action */}
                <form action={logout}>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition"
                    >
                        Logout
                    </button>
                </form>
            </div>
        </header>
    );
};