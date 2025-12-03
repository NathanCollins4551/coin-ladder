// src/app/(main)/portfolio/page.tsx
import Link from 'next/link';
import { calculatePortfolioHoldings } from '@/lib/supabase/service';
import { getPricesForIds, getCoinData } from '@/lib/data/crypto-fetch';
import { EnrichedPortfolioAsset } from '@/types/main';
import { formatCurrency, getChangeColor } from '@/utils/helpers';
import { createClient } from '@/lib/supabase/server';
import SellButton from '@/components/SellButton';


export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await calculatePortfolioHoldings(supabase, user?.id);

  if (portfolio.length === 0) {
    return (
      <div className="p-4 md:p-6 text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
        <div className="p-8 bg-slate-900 rounded-xl shadow-md border border-slate-800">
          <h2 className="text-xl font-semibold text-slate-200">Your portfolio is empty.</h2>
          <p className="text-slate-400 mt-2">
            Start trading to see your assets here.
          </p>
          <Link href="/cryptocurrencies">
            <span className="mt-4 inline-block px-6 py-3 rounded-xl text-white font-semibold transition bg-sky-600 hover:bg-sky-700 shadow-lg">
              Explore Cryptocurrencies
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const assetIds = portfolio.map(asset => asset.coin_id);
  const currentPrices = await getPricesForIds(assetIds);
  const coinData = await getCoinData();

  const enrichedPortfolio: EnrichedPortfolioAsset[] = portfolio.map(asset => {
    const coin = coinData.find(c => c.id === asset.coin_id);
    const current_price = currentPrices[asset.coin_id] || 0;
    const current_value = asset.quantity * current_price;
    const net_profit = current_value - asset.cost_basis;

    return {
      ...asset,
      name: coin?.name || 'Unknown',
      logo_url: coin?.logo_url || '',
      current_price,
      current_value,
      net_profit,
    };
  });

  const totalValue = enrichedPortfolio.reduce((sum, asset) => sum + asset.current_value, 0);
  const totalProfit = enrichedPortfolio.reduce((sum, asset) => sum + asset.net_profit, 0);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
        <p className="text-slate-400">An overview of your cryptocurrency assets.</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-800 rounded-xl shadow-md border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-400 uppercase">Total Portfolio Value</h2>
          <p className="text-4xl font-bold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div className="p-6 bg-slate-800 rounded-xl shadow-md border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-400 uppercase">Total Net Profit</h2>
          <p className={`text-4xl font-bold ${getChangeColor(totalProfit)}`}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Asset</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Amount Owned</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Cost Basis</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Current Price</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Current Value</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Net Profit</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {enrichedPortfolio.map((asset) => (
                <tr key={asset.coin_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={asset.logo_url} alt={asset.name} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{asset.name}</div>
                        <div className="text-sm text-slate-400">{asset.coin_symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{asset.quantity < 1e-4 ? '0' : asset.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">{formatCurrency(asset.cost_basis)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{formatCurrency(asset.current_price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-white">{formatCurrency(asset.current_value)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${getChangeColor(asset.net_profit)}`}>
                    {formatCurrency(asset.net_profit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        {asset.current_price > 0 ? (
                                            <SellButton asset={asset} />
                                        ) : (
                                            <button
                                                disabled
                                                className="bg-slate-700 text-slate-500 px-4 py-2 rounded-md cursor-not-allowed"
                                                title="Price is currently unavailable"
                                            >
                                                Sell
                                            </button>
                                        )}
                                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
