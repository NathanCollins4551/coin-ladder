// src/types/main.ts

export interface PortfolioAsset {
    coin_id: string;
    coin_symbol: string;
    quantity: number;
    cost_basis: number;
}

export interface EnrichedPortfolioAsset extends PortfolioAsset {
    name: string;
    logo_url: string;
    current_price: number;
    current_value: number;
    net_profit: number;
}
