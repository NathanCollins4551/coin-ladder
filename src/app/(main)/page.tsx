// src/app/(main)/page.tsx
import Link from 'next/link';
import {
    calculatePortfolioHoldings,
    getUserTrades,
    Trade,
} from '@/lib/supabase/service';
import {
    getPricesForIds,
    getNewsArticles,
    NewsArticle,
    getCoinData,
    CryptoPriceData,
} from '@/lib/data/crypto-fetch';
import { EnrichedPortfolioAsset } from '@/types/main';
import { formatCurrency, getChangeColor } from '@/utils/helpers';
import { createClient } from '@/lib/supabase/server';

// Helper function to format dates
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// --- Icon Components for Portfolio ---
const ValueIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16h10" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01" />
    </svg>
);

const InvestedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m8 0H7m10 0l-1 9a2 2 0 01-2 2H10a2 2 0 01-2-2l-1-9m12 0H5" />
    </svg>
);

const ProfitLossIcon = ({ isProfit }: { isProfit: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isProfit ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isProfit ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        )}
    </svg>
);

export default async function HomePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // --- Data Fetching ---
    const [
        portfolio,
        recentTrades,
        newsArticles,
        allCoins,
    ] = await Promise.all([
        calculatePortfolioHoldings(supabase, user?.id),
        getUserTrades(supabase, user?.id),
        getNewsArticles(1),
        getCoinData(),
    ]);

    const coinDataMap = new Map<string, CryptoPriceData>(
        allCoins.map(coin => [coin.id, coin])
    );

    // --- Portfolio Calculation ---
    const assetIds = portfolio.map(asset => asset.coin_id);
    const currentPrices = await getPricesForIds(assetIds);

    const enrichedPortfolio: EnrichedPortfolioAsset[] = portfolio.map(asset => {
        const current_price = currentPrices[asset.coin_id] || 0;
        const current_value = asset.quantity * current_price;
        const coinData = coinDataMap.get(asset.coin_id);

        return {
            ...asset,
            name: coinData?.name || asset.coin_symbol,
            logo_url: coinData?.logo_url || '',
            current_price,
            current_value,
            net_profit: current_value - asset.cost_basis,
        };
    });

    const totalValue = enrichedPortfolio.reduce((sum, asset) => sum + asset.current_value, 0);
    const totalCostBasis = enrichedPortfolio.reduce((sum, asset) => sum + asset.cost_basis, 0);
    const totalProfit = totalValue - totalCostBasis;

    return (
        <div className="space-y-10 p-4 sm:p-6 lg:p-8 rounded-lg">
            {/* Header */}
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-pink-500 tracking-tight drop-shadow-lg">Dashboard</h1>
                <p className="mt-4 text-xl text-slate-300 max-w-xl mx-auto">
                    Welcome back! Here’s a snapshot of your account and the market.
                </p>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Portfolio & News) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Portfolio Summary */}
                    <section>
                        <h2 className="text-2xl font-bold text-slate-200 mb-4">Portfolio Snapshot</h2>
                        {portfolio.length > 0 ? (
                            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="flex items-center p-4 bg-slate-800 rounded-xl space-x-4">
                                        <div className="bg-blue-900 p-3 rounded-full"><ValueIcon /></div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Total Value</h3>
                                            <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center p-4 bg-slate-800 rounded-xl space-x-4">
                                        <div className="bg-green-900 p-3 rounded-full"><InvestedIcon /></div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Total Invested</h3>
                                            <p className="text-2xl font-bold text-white">{formatCurrency(totalCostBasis)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center p-4 bg-slate-800 rounded-xl space-x-4">
                                        <div className={`${totalProfit >= 0 ? 'bg-green-900' : 'bg-red-900'} p-3 rounded-full`}><ProfitLossIcon isProfit={totalProfit >= 0} /></div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Overall P&L</h3>
                                            <p className={`text-2xl font-bold ${getChangeColor(totalProfit)}`}>
                                                {formatCurrency(totalProfit)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <Link href="/portfolio" className="block text-center mt-6 text-sm font-medium text-sky-500 hover:underline">
                                    See full portfolio &rarr;
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 text-center">
                                <p className="text-slate-400">Your portfolio is empty.</p>
                                <Link href="/cryptocurrencies" className="inline-block mt-4 px-5 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors">Start Trading!</Link>
                            </div>
                        )}
                    </section>
                    
                    {/* News */}
                    <section>
                        <h2 className="text-2xl font-bold text-slate-200 mb-4">Latest News</h2>
                        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                            <ul className="space-y-5">
                                {newsArticles.slice(0, 4).map((article: NewsArticle) => (
                                    <li key={article.title} className="border-b border-slate-800 pb-5 last:border-0 last:pb-0">
                                        <a href={article.link} target="_blank" rel="noopener noreferrer" className="group flex items-start space-x-4">
                                            <img
                                                src={article.image.includes('text-fallback-source') ? '/newspaper.png' : article.image}
                                                alt={article.title}
                                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                                            />
                                            <div className="flex-grow">
                                                <h3 className="font-semibold text-slate-200 group-hover:text-sky-500 transition-colors leading-tight">{article.title}</h3>
                                                <p className="text-xs sm:text-sm text-slate-400 mt-1">{article.source} &middot; {formatDate(article.date)}</p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/news" className="block text-center mt-6 text-sm font-medium text-sky-500 hover:underline">
                                See all news &rarr;
                            </Link>
                        </div>
                    </section>
                </div>

                {/* Right Column (Recent Activity) */}
                <div className="lg:col-span-1 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-200 mb-4">Recent Activity</h2>
                        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                            <ul className="space-y-4">
                                {recentTrades.slice(0, 8).map((trade: Trade, index: number) => (
                                    <li key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${trade.type === 'BUY' ? 'bg-green-900' : 'bg-red-900'}`}>
                                                <span className={`text-lg font-bold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {trade.type === 'BUY' ? 'B' : 'S'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{trade.coin_symbol.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-white">{trade.crypto_amount.toFixed(5)}</p>
                                            <p className="text-sm text-slate-400">{formatCurrency(trade.fiat_amount)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/my-trades" className="block text-center mt-6 text-sm font-medium text-sky-500 hover:underline">
                                See all activity &rarr;
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
