// src/app/(main)/cryptocurrencies/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTopCryptoPrices, CryptoPriceData } from '@/lib/data/crypto-fetch';
import Link from 'next/link';
import CryptoSearchBar from '@/components/CryptoSearchBar'; // Import the search bar

const CRYPTOS_PER_PAGE = 20;
const INITIAL_FETCH_LIMIT = 100; // Fetch a larger list upfront

// --- Helper Functions ---
const formatPrice = (price: number | undefined) => {
  return (price != null && !isNaN(price)) ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$N/A';
};
const formatChange = (change: number | undefined) => {
  return (change != null && !isNaN(change)) ? `${change.toFixed(2)}%` : 'N/A';
};
const getChangeColor = (change: number | undefined) => {
  if (change == null || isNaN(change)) return 'text-gray-500';
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-500';
};

// --- Main Client Component ---
export default function CryptocurrenciesPage() {
  const [allCryptos, setAllCryptos] = useState<CryptoPriceData[]>([]);
  const [visibleCount, setVisibleCount] = useState(CRYPTOS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialCryptos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cryptos = await getTopCryptoPrices(INITIAL_FETCH_LIMIT);
      if (cryptos.length > 0) {
        setAllCryptos(cryptos);
      } else {
        setError('No cryptocurrencies were returned.');
      }
    } catch (err: any) {
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialCryptos();
  }, [fetchInitialCryptos]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + CRYPTOS_PER_PAGE);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="p-8 text-center text-gray-500">Loading cryptocurrencies...</div>;
    }

    if (error) {
      return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    }

    const visibleCryptos = allCryptos.slice(0, visibleCount);

    if (visibleCryptos.length === 0) {
      return <div className="p-8 text-center text-gray-500">No data available.</div>;
    }

    return (
      <>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-sm font-semibold text-gray-600 uppercase border-b p-4 bg-gray-50">
            <div className="col-span-5 md:col-span-4">Name</div>
            <div className="col-span-3 md:col-span-3 text-right">Price</div>
            <div className="col-span-2 md:col-span-2 text-right">24h %</div>
            <div className="col-span-2 md:col-span-2 text-right">7d %</div>
            <div className="hidden md:block col-span-1 text-right"></div>
          </div>

          {/* Table Body */}
          {visibleCryptos.map((crypto) => (
            <Link 
              key={crypto.id}
              href={`/cryptocurrencies/${crypto.id}`}
              className="grid grid-cols-12 items-center border-b hover:bg-gray-50 transition duration-100 p-4"
            >
              <div className="col-span-5 md:col-span-4 flex items-center space-x-3">
                <img 
                    src={crypto.logo_url || 'https://via.placeholder.com/30'} 
                    alt={`${crypto.name} logo`} 
                    className="w-8 h-8 rounded-full" 
                /> 
                <div>
                  <span className="font-medium text-gray-900">{crypto.name}</span>
                  <span className="text-xs text-gray-500 block md:hidden">{crypto.symbol}</span>
                </div>
                <span className="hidden md:inline text-sm text-gray-500">{crypto.symbol}</span>
              </div>
              <div className="col-span-3 md:col-span-3 text-right font-bold text-gray-800">
                {formatPrice(crypto.price)}
              </div>
              <div className={`col-span-2 md:col-span-2 text-right font-semibold ${getChangeColor(crypto.percent_change_24h)}`}>
                {formatChange(crypto.percent_change_24h)}
              </div>
              <div className={`col-span-2 md:col-span-2 text-right font-semibold ${getChangeColor(crypto.percent_change_7d)}`}>
                {formatChange(crypto.percent_change_7d)}
              </div>
              <div className="col-span-1 text-right text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>

        {visibleCount < allCryptos.length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 rounded-xl text-white font-semibold transition bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              Load More
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Cryptocurrencies
        </h1>
        <CryptoSearchBar />
      </div>
      {renderContent()}
    </div>
  );
}