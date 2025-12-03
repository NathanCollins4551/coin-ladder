
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
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
            >
                Sell
            </button>

            {isOpen && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-xl border border-gray-100 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 text-3xl font-semibold transition-colors"
                        >
                            &times;
                        </button>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Sell {asset.name} ({asset.coin_symbol.toUpperCase()})</h2>
                        
                        {error && (
                            <div className="bg-red-50 border border-red-300 text-red-700 px-5 py-3 rounded-lg relative mb-5 text-base" role="alert">
                                <strong className="font-bold mr-1">Error:</strong>
                                <span className="block sm:inline"> {error}</span>
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="usd-amount" className="block text-base font-semibold text-gray-700 mb-3">
                                Amount to sell in USD
                            </label>
                            <input
                                type="number"
                                id="usd-amount"
                                value={usdAmount}
                                onChange={handleUsdAmountChange}
                                className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                                placeholder="e.g., 50.00"
                                step="0.01"
                                min="0"
                            />
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-gray-600">You hold: <span className="font-medium">{asset.quantity.toFixed(6)} {asset.coin_symbol.toUpperCase()}</span></span>
                                <button
                                    onClick={handleSellAllClick}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium shadow-md"
                                >
                                    Sell All
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-end items-center space-x-4 mt-8">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                                className="px-5 py-2.5 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSell}
                                disabled={isLoading || (!usdAmount && !isSellingAll) || (parseFloat(usdAmount) <= 0 && !isSellingAll) || (cryptoAmountFromUsdInput > asset.quantity + 1e-9 && !isSellingAll) }
                                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md disabled:bg-gray-400"
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
