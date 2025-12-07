import { createAdminClient } from '@/lib/supabase/admin-client';
import { createClient } from '@/lib/supabase/server';
import { Trophy } from 'lucide-react';

// Define the structure for a single leaderboard entry
interface LeaderboardEntry {
    rank: number;
    username: string;
    balance: number;
    user_id: string; // <-- Add user_id to identify the current user
}

// Helper function for currency formatting
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 2 
    }).format(value);
};

/**
 * Fetches the top 10 users ranked by cash_balance.
 * Uses the Admin Client to bypass RLS and read all necessary profile data.
 */
async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    // 🔑 Use the Admin Client to ensure all user profiles are visible for ranking
    const supabaseAdmin = createAdminClient();

    // Fetch required columns: preferred_name (for display) and cash_balance (for ranking)
    const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, preferred_name, cash_balance') // <-- Fetch user_id
        .limit(1000); // Fetch a larger set to sort accurately

    if (error) {
        console.error("Leaderboard fetch error:", error);
        return []; 
    }

    if (!profiles || profiles.length === 0) {
        return [];
    }

    // 1. Sort in memory by cash_balance in descending order
    const sortedProfiles = profiles.sort((a, b) => 
        (b.cash_balance || 0) - (a.cash_balance || 0)
    ).slice(0, 10); // 2. Take the top 10

    // 3. Map to final structure with ranks
    return sortedProfiles.map((profile, index) => ({
        rank: index + 1,
        // Use the preferred_name, falling back if necessary
        username: profile.preferred_name || 'Anonymous User', 
        balance: profile.cash_balance || 0,
        user_id: profile.user_id, // <-- Return user_id
    }));
}

/**
 * Fetches the rank of a specific user.
 */
async function fetchUserRank(userId: string): Promise<{ rank: number; balance: number } | null> {
    const supabaseAdmin = createAdminClient();
    const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, cash_balance')
        .limit(1000);

    if (error) {
        console.error("User rank fetch error:", error);
        return null;
    }

    if (!profiles) {
        return null;
    }

    const sortedProfiles = profiles.sort((a, b) => (b.cash_balance || 0) - (a.cash_balance || 0));
    const userIndex = sortedProfiles.findIndex(p => p.user_id === userId);

    if (userIndex === -1) {
        return null;
    }

    return {
        rank: userIndex + 1,
        balance: sortedProfiles[userIndex].cash_balance || 0,
    };
}


// Main Leaderboard Server Component
export default async function LeaderboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [leaderboardData, userRank] = await Promise.all([
        fetchLeaderboard(),
        user ? fetchUserRank(user.id) : Promise.resolve(null),
    ]);

    const hasData = leaderboardData.length > 0;
    const isUserInTop10 = user && leaderboardData.some(entry => entry.user_id === user.id);

    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-white tracking-tight">Leaderboard</h1>
                    <p className="mt-4 text-lg text-slate-400">See who's on top of the cash balance rankings.</p>
                </div>

                {userRank && (
                    <div className="relative bg-gradient-to-r from-sky-500 to-indigo-600 p-6 mb-8 shadow-2xl rounded-2xl text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm uppercase tracking-wider font-semibold">Your Rank</p>
                                <p className="text-5xl font-bold">#{userRank.rank}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm uppercase tracking-wider font-semibold">Your Balance</p>
                                <p className="text-3xl font-bold">{formatCurrency(userRank.balance)}</p>
                            </div>
                        </div>
                        <Trophy className="absolute bottom-4 right-4 text-white/20 h-16 w-16" />
                    </div>
                )}

                <div className="bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-slate-700">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 text-xs font-bold uppercase text-slate-400 tracking-wider px-6 py-4 border-b border-slate-700 bg-slate-700">
                        <div className="col-span-1">#</div>
                        <div className="col-span-6">User</div>
                        <div className="col-span-5 text-right">Balance</div>
                    </div>

                    {/* Leaderboard Rows */}
                    {hasData ? (
                        <div className="divide-y divide-slate-700">
                            {leaderboardData.map((entry, index) => {
                                const isCurrentUser = user && entry.user_id === user.id;
                                const isTopThree = index < 3;
                                const isFirst = index === 0;

                                // Determine style based on rank
                                let rankStyle = 'text-slate-400';
                                let crown = null;
                                if (isFirst) {
                                    rankStyle = 'text-amber-400';
                                    crown = '👑';
                                } else if (index === 1) {
                                    rankStyle = 'text-slate-300';
                                } else if (index === 2) {
                                    rankStyle = 'text-orange-500';
                                }

                                return (
                                    <div
                                        key={entry.rank}
                                        className={`grid grid-cols-12 items-center px-6 py-4 transition-all duration-300 ${
                                            isCurrentUser 
                                                ? 'bg-slate-700 border-l-4 border-sky-500 z-10 shadow-lg' 
                                                : 'hover:bg-slate-700'
                                        }`}
                                    >
                                        {/* Rank Column */}
                                        <div className={`col-span-1 text-lg font-bold ${rankStyle}`}>
                                            {entry.rank} {crown}
                                        </div>

                                        {/* Display Name */}
                                        <div className="col-span-6 text-base font-semibold text-white">
                                            {entry.username}
                                        </div>

                                        {/* Cash Balance */}
                                        <div className="col-span-5 text-right text-xl font-semibold text-emerald-400">
                                            {formatCurrency(entry.balance)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-slate-400">
                            <p>No user data available to display the leaderboard.</p>
                            <p className="mt-2 text-sm">Ensure new users are created and have a cash balance entry.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}