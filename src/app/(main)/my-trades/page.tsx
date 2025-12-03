import { createClient } from '@/lib/supabase/server';
import { getUserTrades, Trade } from '@/lib/supabase/service';

export default async function MyTradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const trades = user ? await getUserTrades(supabase, user.id) : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6 text-white">My Trades</h1>

      {trades.length === 0 ? (
        <p className="text-slate-400">No trades found yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-slate-800 shadow-md rounded-lg overflow-hidden border border-slate-700">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Coin</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Fiat Value</th>
                <th className="py-3 px-4 text-left">Price</th>
                {/* <th className="py-3 px-4 text-left">Date</th> */}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {trades.map((trade: Trade, index: number) => (
                <tr key={index} className="border-b border-slate-700 hover:bg-slate-700">
                  <td className={`py-3 px-4 ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.type}
                  </td>
                  <td className="py-3 px-4">{trade.coin_symbol.toUpperCase()}</td>
                  <td className="py-3 px-4">{trade.crypto_amount.toFixed(8)}</td>
                  <td className="py-3 px-4">${trade.fiat_amount.toFixed(2)}</td>
                  <td className="py-3 px-4">${trade.execution_price.toFixed(2)}</td>
                  {/* <td className="py-3 px-4">{trade.created_at ? new Date(trade.created_at).toLocaleString() : 'N/A'}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}