
'use server';

import { createClient } from '@/lib/supabase/server';
import { createTrade } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';

export async function sellAsset(
    coinId: string,
    coinSymbol: string,
    sellAmount: number,
    currentPrice: number
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'User not authenticated' };
    }

    if (sellAmount <= 0) {
        return { error: 'Sell amount must be greater than zero.' };
    }

    const fiatAmount = sellAmount * currentPrice;

    const tradeData = {
        coin_id: coinId,
        coin_symbol: coinSymbol,
        type: 'SELL' as const,
        fiat_amount: fiatAmount,
        crypto_amount: sellAmount,
        execution_price: currentPrice,
    };

    try {
        await createTrade(supabase, tradeData, false, user.id);
        revalidatePath('/(main)/portfolio');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
