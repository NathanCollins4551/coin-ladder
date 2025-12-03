import { createClient } from '@/lib/supabase/server';
import { getUserTrades, Trade } from '@/lib/supabase/service';

export default async function MyTradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const trades = user ? await getUserTrades(supabase, user.id) : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">My Trades</h1>

      {trades.length === 0 ? (
        <p className="text-gray-500">No trades found yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Coin</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Fiat Value</th>
                <th className="py-3 px-4 text-left">Price</th>
                {/* <th className="py-3 px-4 text-left">Date</th> */}
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {trades.map((trade: Trade, index: number) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className={`py-3 px-4 ${trade.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
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