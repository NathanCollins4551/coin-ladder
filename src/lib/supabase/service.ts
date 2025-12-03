// src/lib/supabase/service.ts
import type { SupabaseClient } from '@supabase/supabase-js';


// --- Error Interface ---
// Defining the basic shape of a Supabase Postgrest Error to satisfy the TypeScript compiler.
interface SupabaseFetchError {
    code: string;
    message: string;
}

// --- Data Interfaces ---
// NOTE: This interface maps directly to the required fields in the 'user_profiles' table.
export interface Wallet {
    user_id: string;
    display_name: string; // NEW: Added the mandatory display_name field
    cash_balance: number;
}

export interface Trade {
    user_id: string;
    coin_id: string;
    coin_symbol: string;
    type: 'BUY' | 'SELL';
    fiat_amount: number;
    crypto_amount: number;
    execution_price: number;
    // created_at?: string; // Removed as per database error
}

/**
 * NEW INTERFACE: Represents the raw trade record structure fetched directly from the database.
 */
export interface RawTradeRecord {
    coin_id: string;
    coin_symbol: string;
    type: 'BUY' | 'SELL';
    fiat_amount: number;
    crypto_amount: number;
    execution_price: number;
    // created_at?: string; // Removed as per database error
}

export interface PortfolioAsset {
    coin_id: string;
    coin_symbol: string;
    quantity: number;
    cost_basis: number; // Total USD invested (Used for P&L calculation)
    current_price?: number;
    market_value?: number;
    pnl_usd?: number;
    pnl_percent?: number;
}

// --- CORE UTILITY FUNCTIONS ---

/**
 * Retrieves the current authenticated user's ID.
 */
async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // In a real app, this should force a sign-in or return an error.
        throw new Error("User not authenticated.");
    }
    return user.id;
}

/**
 * Ensures the user has a wallet record in the 'user_profiles' table. 
 * Creates one with $10,000 if it doesn't exist (if data is null or PGRST116 error).
 *  * FIX: Must now include the mandatory display_name on creation.
 */
async function ensureWalletExists(supabase: SupabaseClient, userId: string): Promise<Wallet> {
    // Fetch the wallet data, including display_name
    const { data: wallet, error } = await supabase
        .from('user_profiles') 
        .select('display_name, cash_balance') // FIX: Added display_name to select
        .eq('user_id', userId)
        .single();

    // Use type assertion to safely access the error code
    const supabaseError = error as SupabaseFetchError | null;

    // 1. Check for unexpected database error (not 'no rows found')
    if (supabaseError && supabaseError.code !== 'PGRST116') {
        throw new Error(`Database error fetching profile: ${supabaseError.message}`);
    }

    // 2. CHECK FOR MISSING WALLET: If no wallet data was returned (null) 
    //    OR the specific 'no rows found' error was received, create a new one.
    if (!wallet || (supabaseError && supabaseError.code === 'PGRST116')) {
        
        // FIX: Generate a placeholder display name for existing users missing a profile.
        // We use the first 8 characters of the UUID to ensure uniqueness.
        const placeholderName = `User-${userId.substring(0, 8)}`;

        // Wallet does not exist, create starting with $10,000
        const startingProfile = { 
            user_id: userId, 
            display_name: placeholderName, // FIX: Include mandatory display_name
            cash_balance: 10000.00 
        };

        const { data: newWalletData, error: insertError } = await supabase
            .from('user_profiles')
        .insert(startingProfile)
            .select('display_name, cash_balance') // FIX: Select both fields
            .single();
        
        // Use type assertion for insertError as well
        const insertSupabaseError = insertError as SupabaseFetchError | null;

        if (insertSupabaseError) throw new Error("Failed to create new profile/wallet.");
        
        // FIX: Add check for newWalletData being null, which is possible if the insert fails silently (e.g., RLS).
        if (!newWalletData) {
            throw new Error("Profile creation succeeded but returned no data.");
        }

        // Return the newly created wallet data, attaching the userId
        return { 
            user_id: userId, 
            display_name: newWalletData.display_name, 
            cash_balance: newWalletData.cash_balance 
        } as Wallet; 
    }

    // 3. WALLET FOUND: Data was successfully returned.
    // Attach userId to the existing wallet data before returning
    // wallet is guaranteed to be an object with 'cash_balance' and 'display_name' here.
    return { user_id: userId, display_name: wallet.display_name, cash_balance: wallet.cash_balance } as Wallet;
}


/**
 * 🌟 CORE TRADING LOGIC 🌟
 * Places a trade and updates the user's cash balance in 'user_profiles'.
 */
export async function createTrade(
    supabase: SupabaseClient,
    tradeData: Omit<Trade, 'user_id'>, // Accepts trade data without the user ID
    isBuy: boolean,
    userId?: string
): Promise<void> {
    const id = userId || await getCurrentUserId(supabase);
    const tradeRecord: Trade = { ...tradeData, user_id: id };
    
    // 1. Calculate net change in cash
    const cashChange = isBuy ? -tradeRecord.fiat_amount : tradeRecord.fiat_amount;

    // 2. Fetch current wallet balance
    const { data: currentWallet, error: fetchError } = await supabase
        .from('user_profiles') // <-- CORRECTED TABLE NAME
        .select('cash_balance')
        .eq('user_id', id)
        .single();
    
    // Use type assertion to safely access the fetchError code
    const fetchSupabaseError = fetchError as SupabaseFetchError | null;

    // If a non-PGRST116 error occurs, we throw.
    if (fetchSupabaseError && fetchSupabaseError.code !== 'PGRST116') throw new Error("Error fetching wallet.");
    
    const currentBalance = currentWallet ? currentWallet.cash_balance : 0;
    const newCashBalance = currentBalance + cashChange;

    if (newCashBalance < 0) {
        throw new Error(`Insufficient funds: Required: $${Math.abs(cashChange).toFixed(2)}, Available: $${currentBalance.toFixed(2)}.`);
    }

    try {
        // Use a transaction/RPC function here for atomicity, but for REST, we update sequentially:

        // 3. Update the cash balance
        const { error: updateError } = await supabase
            .from('user_profiles') // <-- CORRECTED TABLE NAME
            .update({ cash_balance: newCashBalance })
            .eq('user_id', id);
        
        // Use type assertion for updateError
        const updateSupabaseError = updateError as SupabaseFetchError | null;
        if (updateSupabaseError) throw new Error("Failed to update wallet balance.");
        
        // 4. Record the immutable trade
        const { error: tradeError } = await supabase
            .from('trades')
            .insert(tradeRecord);
        
        // Use type assertion for tradeError
        const tradeSupabaseError = tradeError as SupabaseFetchError | null;
        if (tradeSupabaseError) throw new Error("Failed to record trade history.");

    } catch (error) {
        // Log the original error if transaction fails
        console.error("Supabase Trade Transaction Failed:", error); 
        throw error;
    }
}
/**
 * Fetches the user's current cash balance.
 */
export async function getWalletBalance(supabase: SupabaseClient): Promise<Wallet> {
    const userId = await getCurrentUserId(supabase);
    // ensureWalletExists handles both fetching the existing balance and creating a new one if missing
    return ensureWalletExists(supabase, userId);
}



/**

 * Fetches all trade records for the currently authenticated user.

 */

export async function getUserTrades(supabase: SupabaseClient, userId?: string): Promise<Trade[]> {

    const id = userId || await getCurrentUserId(supabase);



    const { data: trades, error } = await supabase

        .from('trades')

        .select('*') // Select all columns for the trade record

        .eq('user_id', id)

        // .order('created_at', { ascending: false }); // Removed as per database error



    if (error) {

        console.error("Supabase error fetching user trades:", error);

        return [];

    }



    return trades as Trade[];

}



/**



 * Calculates the user's current portfolio holdings (quantity and cost basis) from the trades history.



 */



export async function calculatePortfolioHoldings(supabase: SupabaseClient, userId?: string): Promise<PortfolioAsset[]> {



    const id = userId || await getCurrentUserId(supabase);



    



    // RLS ensures only the current user's trades are returned.



    // We expect the data to be an array of RawTradeRecord



    const { data: trades, error } = await supabase



        .from('trades')



        .select('coin_id, coin_symbol, type, fiat_amount, crypto_amount, execution_price')



        .eq('user_id', id); // The RLS policy should make this EQ redundant, but good for clarity







    if (error) {



        console.error("Supabase error fetching trades:", error);



        return [];



    }







    const holdingsMap = new Map<string, PortfolioAsset>();







    // FIX: Explicitly cast trades as RawTradeRecord[] to give it a type.



        (trades as RawTradeRecord[] || []).forEach(trade => {



    



            const t = trade; // Now 't' is implicitly typed as RawTradeRecord



    



            const coinId = t.coin_id;



    



    



            if (!holdingsMap.has(coinId)) {



    



                holdingsMap.set(coinId, {



    



                    coin_id: coinId,



    



                    coin_symbol: t.coin_symbol,



    



                    quantity: 0,



    



                    cost_basis: 0,



    



                });



    



            }



    



    



            const asset = holdingsMap.get(coinId)!;



    



    



            if (t.type === 'BUY') {



    



                asset.quantity += t.crypto_amount;



    



                asset.cost_basis += t.fiat_amount;



    



            } else if (t.type === 'SELL') {



                // Check if selling all or nearly all



                const isSellingAll = Math.abs(t.crypto_amount - asset.quantity) < 1e-9; // Using a small epsilon



    



                if (isSellingAll) {



                    asset.quantity = 0;



                    asset.cost_basis = 0;



                            } else {



                                // Proceed with normal partial sell calculation if not selling all



                                // Ensure asset.quantity is not zero before division to avoid NaN/Infinity



                                if (asset.quantity > 0) {



                                    const sellRatio = t.crypto_amount / asset.quantity;



                                    asset.cost_basis -= asset.cost_basis * sellRatio;



                                    asset.quantity -= t.crypto_amount;



                



                                    // --- NEW CLEANUP STEP HERE ---



                                    // If after a partial sell, the remaining quantity is very small, zero it out.



                                    // This handles cases where floating point math leaves a tiny residue.



                                    if (asset.quantity < 1e-9) {



                                        asset.quantity = 0;



                                        asset.cost_basis = 0;



                                    }



                                } else {



                                    // If asset quantity is already zero or negative, no further action needed



                                    // (though this scenario should ideally be prevented by UI/validation)



                                }



                            }



    



    



            }



    



    



        });



    



        // --- Post-processing: Clean up any remaining dust ---



        // Iterate through all calculated holdings and zero out anything below the threshold



        const cleanedHoldings = Array.from(holdingsMap.values()).map(asset => {



            if (asset.quantity < 1e-4) { // User-defined threshold for "dust"



                return { ...asset, quantity: 0, cost_basis: 0 };



            }



            return asset;



        });



    



    



        return cleanedHoldings.filter(asset => asset.quantity > 1e-4); // Filter out zeroed assets and dust



    



}