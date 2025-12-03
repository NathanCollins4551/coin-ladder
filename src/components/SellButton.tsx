
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnrichedPortfolioAsset } from '@/types/main';
import { sellAsset } from '@/app/(main)/portfolio/actions';
import { formatCurrency } from '@/utils/helpers';


interface SellButtonProps {
    asset: EnrichedPortfolioAsset;
}

export default function SellButton({ asset }: SellButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [usdAmount, setUsdAmount] = useState<string>(''); // Amount to sell in USD
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSellingAll, setIsSellingAll] = useState(false); // State to track if selling all
    const router = useRouter();

    // Calculated crypto amount from USD input
    const cryptoAmountFromUsdInput = asset.current_price > 0 && usdAmount ? parseFloat(usdAmount) / asset.current_price : 0;

    const handleConfirmSell = async () => {
        setIsLoading(true);
        setError(null);
        
        let cryptoAmountToSell: number;

        if (isSellingAll) {
            cryptoAmountToSell = asset.quantity;
        } else {
            cryptoAmountToSell = cryptoAmountFromUsdInput;
        }

        // Validation
        if (isNaN(cryptoAmountToSell) || cryptoAmountToSell <= 0) {
            setError('Please enter a valid amount to sell.');
            setIsLoading(false);
            return;
        }
        
        // Final check to prevent selling more than held, with a small epsilon for floating point comparison
        if (cryptoAmountToSell > asset.quantity + 1e-9) { 
            setError(`You can only sell up to ${asset.quantity.toFixed(6)} ${asset.coin_symbol.toUpperCase()}.`);
            setIsLoading(false);
            return;
        }

        const result = await sellAsset(
            asset.coin_id,
            asset.coin_symbol,
            cryptoAmountToSell, 
            asset.current_price
        );

        setIsLoading(false);

        if (result.error) {
            setError(result.error);
        }
        else {
            setIsOpen(false);
            setUsdAmount('');
            setIsSellingAll(false); // Reset state
            router.refresh(); // Refresh the page
        }
    };
    
    const handleSellAllClick = () => {
        setIsSellingAll(true);
        const totalSellableUSD = asset.quantity * asset.current_price;
        setUsdAmount(totalSellableUSD.toFixed(2));
    };
    
    const handleUsdAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsdAmount(e.target.value);
        setIsSellingAll(false); // User is now entering a manual amount
    };

    return (
        <>
            <button
                onClick={() => { setIsOpen(true); setError(null); setUsdAmount(''); setIsSellingAll(false); }}
                className="bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 transition-colors text-sm"
            >
                Sell
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-900 p-10 rounded-xl shadow-2xl w-full max-w-xl border border-slate-800 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 text-3xl font-semibold transition-colors"
                        >
                            &times;
                        </button>
                        <h2 className="text-3xl font-extrabold text-white mb-6">Sell {asset.name} ({asset.coin_symbol.toUpperCase()})</h2>
                        
                        {error && (
                            <div className="bg-red-900 border border-red-700 text-red-300 px-5 py-3 rounded-lg relative mb-5 text-base" role="alert">
                                <strong className="font-bold mr-1">Error:</strong>
                                <span className="block sm:inline"> {error}</span>
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="usd-amount" className="block text-base font-semibold text-slate-300 mb-3">
                                Amount to sell in USD
                            </label>
                            <input
                                type="number"
                                id="usd-amount"
                                value={usdAmount}
                                onChange={handleUsdAmountChange}
                                className="mt-1 block w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-lg text-white"
                                placeholder="e.g., 50.00"
                                step="0.01"
                                min="0"
                            />
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-slate-400">You hold: <span className="font-medium text-white">{asset.quantity.toFixed(6)} {asset.coin_symbol.toUpperCase()}</span></span>
                                <button
                                    onClick={handleSellAllClick}
                                    className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-sm font-medium shadow-md"
                                >
                                    Sell All
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-end items-center space-x-4 mt-8">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                                className="px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSell}
                                disabled={isLoading || (!usdAmount && !isSellingAll) || (parseFloat(usdAmount) <= 0 && !isSellingAll) || (cryptoAmountFromUsdInput > asset.quantity + 1e-9 && !isSellingAll) }
                                className="px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-semibold shadow-md disabled:bg-slate-600"
                            >
                                {isLoading ? 'Processing...' : 'Confirm Sell'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
