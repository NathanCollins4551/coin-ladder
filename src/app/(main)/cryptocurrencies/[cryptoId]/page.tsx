// src/app/(main)/cryptocurrencies/[cryptoId]/page.tsx

'use client'; 

import Link from 'next/link';
import { getCryptoDetails, getCryptoPriceHistory } from '@/lib/data/crypto-fetch';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import TradePanel from '@/components/TradePanel'; // Import the new shared component
import { getWalletBalance, calculatePortfolioHoldings, Wallet, PortfolioAsset } from '@/lib/supabase/service'; // Import Supabase Services
import { createClient } from '@/lib/supabase/client';

// Define the interface for the detailed data
interface CryptoDetails {
  symbol: string;
  name: string;
  logo_url: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  circulating_supply: number;
  max_supply: number | null;
  about_text: string;
}

// --- Helper Functions ---
const formatCurrency = (value: number) => {
  const cleanedValue = typeof value === 'number' ? Math.max(0, value) : 0; 
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cleanedValue);
};
const formatLargeNumber = (value: number) => {
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  return value.toLocaleString();
};
const getChangeColor = (change: number) => {
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-slate-500';
};
const durationOptions = ['1h', '6h', '1d', '1w', '1m', '1y'];

// --- Main Client Component ---
export default function CryptoInfoPage() {
  
  // Market Data State
  const [details, setDetails] = useState<CryptoDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState('1d');
  const [chartData, setChartData] = useState<any[]>([]); 
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Portfolio/Wallet State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true);

  const params = useParams();
  const coinId = (params.cryptoId as string) || 'UNKNOWN';
  const supabase = createClient();
  const isFetchingChart = useRef(false);

  // --- Portfolio & Wallet Refresh Logic ---
  // This function fetches the wallet and recalculates all holdings
  const refreshPortfolio = useCallback(async () => {
    setIsPortfolioLoading(true);
    try {
      // 1. Fetch available cash balance
      const walletData = await getWalletBalance(supabase);
      setWallet(walletData);

      // 2. Calculate holdings (quantity and cost basis) from trades history
      const holdings = await calculatePortfolioHoldings(supabase);
      
      // 3. Get live prices for all held assets
      // This is necessary to calculate current market value and P&L
      const assetPrices = await Promise.all(holdings.map(asset => 
        // Re-use getCryptoDetails to grab the current price efficiently
        getCryptoDetails(asset.coin_id)
      ));

      // 4. Combine holdings with current prices to calculate market metrics
      const updatedPortfolio = holdings.map((asset, index) => {
        const currentAssetDetails = assetPrices[index];
        const currentPrice = currentAssetDetails?.current_price || 0;
        
        const marketValue = asset.quantity * currentPrice;
        const pnlUsd = marketValue - asset.cost_basis;
        const pnlPercent = asset.cost_basis > 0 ? (pnlUsd / asset.cost_basis) * 100 : 0;

        return {
          ...asset,
          current_price: currentPrice,
          market_value: marketValue,
          pnl_usd: pnlUsd,
          pnl_percent: pnlPercent,
        };
      });

      setPortfolio(updatedPortfolio);
    } catch (e) {
      console.error("Failed to refresh portfolio:", e);
    } finally {
      setIsPortfolioLoading(false);
    }
  }, [supabase]);

  // Total Portfolio Value Calculation
  const totalInvested = portfolio.reduce((sum, asset) => sum + asset.cost_basis, 0);
  const totalMarketValue = portfolio.reduce((sum, asset) => sum + (asset.market_value || 0), 0);
  const netProfitLoss = totalMarketValue - totalInvested;
  const netPnlPercent = totalInvested > 0 ? (netProfitLoss / totalInvested) * 100 : 0;

  // --- Initial Data Fetching (Market Details & Initial Portfolio Load) ---
  useEffect(() => {
    if (coinId === 'UNKNOWN') {
      setError('Invalid Crypto ID.');
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCryptoDetails(coinId);
        if (!data) {
          throw new Error('Coin not found or API failed.');
        }
        setDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
    refreshPortfolio(); // Initial portfolio load
  }, [coinId, refreshPortfolio]); 

  // --- Data Fetching (Chart) ---
  useEffect(() => {
    if (coinId === 'UNKNOWN') return;

    const debounceFetch = setTimeout(() => {
      if (isFetchingChart.current) return;

      async function fetchChartData() {
        isFetchingChart.current = true;
        try {
          setIsChartLoading(true);
          const historyData = await getCryptoPriceHistory(coinId, selectedDuration); 
          setChartData(historyData); 
        } catch (err: any) {
          console.error("Failed to fetch chart data:", err.message);
          setChartData([]); 
        } finally {
          setIsChartLoading(false);
          isFetchingChart.current = false;
        }
      }
      fetchChartData();
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceFetch);
  }, [coinId, selectedDuration]);

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="p-6 text-center text-slate-400 text-lg font-medium">
        Loading details for {coinId.toUpperCase()}...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-6 bg-red-900 text-red-300 rounded-xl shadow-lg">Error: {error}</div>
    );
  }

  const changeColor = getChangeColor(details.price_change_percentage_24h);
  // Find the specific asset being viewed in the portfolio
  const currentHolding = portfolio.find(asset => asset.coin_id === coinId);

  return (
    <div className="space-y-8">
      <Link href="/cryptocurrencies" className="text-sky-500 hover:text-sky-400 transition block">
        &larr; Back to Market
      </Link>

      <header className="flex items-center space-x-4">
        <img src={details.logo_url} alt={`${details.name} logo`} className="w-12 h-12 rounded-full shadow-md" />
        <h1 className="text-4xl font-extrabold text-white">
          {details.name} <span className="text-slate-400">({details.symbol})</span>
        </h1>
      </header>

      {/* --- Portfolio Overview and Trading Panel (4-Column Layout) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    
    {/* Trading Panel (1/4 width) */}
    <div className="lg:col-span-1">
      <TradePanel
        supabase={supabase}
        // FIX: Use coinId from the URL parameter, not the details object
        coinId={coinId} 
        coinSymbol={details.symbol}
        currentPrice={details.current_price}
        cashBalance={wallet?.cash_balance || 0} // Pass cash balance
        onTradeSuccess={refreshPortfolio} // Pass refresh callback
      />
    </div>

        {/* Total Portfolio Snapshot (3/4 width) */}
        <div className="lg:col-span-3 bg-slate-900 p-6 rounded-xl shadow-lg space-y-4 border border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Account Snapshot</h2>
            {isPortfolioLoading ? (
              <p className="text-slate-400">Loading wallet data...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-900 rounded-lg">
                  <p className="text-xs text-slate-400">Available Cash</p>
                  <p className="font-bold text-xl text-blue-300">{formatCurrency(wallet?.cash_balance || 0)}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Net Invested</p>
                  <p className="font-bold text-xl text-white">{formatCurrency(totalInvested)}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Total Market Value</p>
                  <p className="font-bold text-xl text-white">{formatCurrency(totalMarketValue)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: netProfitLoss >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                  <p className="text-xs text-slate-400">Overall P&L</p>
                  <p className={`font-bold text-xl ${getChangeColor(netProfitLoss)}`}>
                    {netProfitLoss >= 0 && '+'}{formatCurrency(netProfitLoss)} ({netPnlPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold border-t border-slate-800 pt-4 text-white">Your {details.name} Position</h3>
            {currentHolding ? (
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-sm text-slate-400">Held Quantity</p>
                  <p className="font-bold text-lg text-white">{currentHolding.quantity.toFixed(6)} {currentHolding.coin_symbol}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Avg. Cost / Coin</p>
                  {/* Safely calculate average cost, preventing division by zero */}
                  <p className="font-bold text-lg text-white">{formatCurrency(currentHolding.cost_basis / (currentHolding.quantity > 0 ? currentHolding.quantity : 1))}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Unrealized P&L</p>
                  <p className={`font-bold text-lg ${getChangeColor(currentHolding.pnl_usd || 0)}`}>
                    {currentHolding.pnl_usd! >= 0 && '+'}{formatCurrency(currentHolding.pnl_usd || 0)} ({currentHolding.pnl_percent?.toFixed(2) || 0}%)
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 p-4 bg-slate-800 rounded-lg">You do not currently hold any {details.name}.</p>
            )}
        </div>
      </div>

      {/* --- Market Overview and Chart --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Market Overview (Left Column - 33% - Full Height) */}
        <div className="lg:col-span-1 bg-slate-900 p-6 rounded-xl shadow-lg space-y-4 border border-slate-800">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Market Overview</h2>
          
          <div className="space-y-4 text-slate-400">
            <p className="flex justify-between items-center">
              <span className="font-medium text-slate-400">Current Price</span>
              <span className="font-bold text-2xl text-white">{formatCurrency(details.current_price)}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium text-slate-400">24h Change</span>
              <span className={`font-semibold text-lg ${getChangeColor(details.price_change_percentage_24h)}`}>
                {details.price_change_percentage_24h.toFixed(2)}%
              </span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium text-slate-400">Market Cap</span>
              <span className="font-semibold text-white text-lg">{formatCurrency(details.market_cap)}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium text-slate-400">Circulating Supply</span>
              <span className="font-semibold text-white text-lg">{formatLargeNumber(details.circulating_supply)} {details.symbol}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium text-slate-400">Max Supply</span>
              <span className="font-semibold text-white text-lg">
                {details.max_supply ? formatLargeNumber(details.max_supply) + ` ${details.symbol}` : 'N/A'}
              </span>
            </p>
          </div>
        </div>

        {/* --- Price Chart (Right Column - 66%) --- */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-4">Price Chart</h2>
          <div className="flex space-x-2 mb-4">
            {/* Chart Duration Selector */}
            {durationOptions.map(duration => (
              <button 
                key={duration}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  selectedDuration === duration 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
                onClick={() => setSelectedDuration(duration)}
              >
                {duration}
              </button>
            ))}
          </div>
          
          {/* --- CHART RENDER --- */}
          <div className="h-64 w-full">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading chart...</div>
            ) : !chartData || chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">No chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(time) => {
                      const date = new Date(time);
                      if (selectedDuration === '1h' || selectedDuration === '6h' || selectedDuration === '1d') {
                        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      }
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    dataKey="price" 
                    domain={['auto', 'auto']}
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(price) => formatCurrency(price)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#cbd5e1' }}
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                    formatter={(value: number) => [formatCurrency(value), 'Price']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* --- About Section --- */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-4">About {details.name}</h2>
        <p className="text-slate-400 leading-relaxed whitespace-pre-line">
          {details.about_text || "No detailed description is available for this asset at the moment."}
        </p>
      </div>
    </div>
  );
}