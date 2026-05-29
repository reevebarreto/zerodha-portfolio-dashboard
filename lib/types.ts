/**
 * TypeScript type definitions for API responses
 */

// Auth types
export interface AuthStatus {
  authenticated: boolean;
  token_created_at?: string;
}

export interface LoginURL {
  login_url: string;
}

// Holdings types
export interface Holding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  pnl_percent: number;
  current_value: number;
  invested_value: number;
  day_change: number;
  day_change_percent: number;
  portfolio_weight: number;
  t1_quantity: number;
}

export interface BuffettScore {
  total: number;
  roe?: number;
  debt_equity?: number;
  net_margin?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  fcf_positive: boolean;
  breakdown: Record<string, number>;
}

export interface Fundamentals {
  sector?: string;
  market_cap?: number;
  "52_week_high"?: number;
  "52_week_low"?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  dividend_yield?: number;
}

export interface HoldingDetail {
  holding: Holding;
  buffett_score?: BuffettScore;
  fundamentals?: Fundamentals;
}

export interface TopStock {
  symbol: string;
  pnl_percent: number;
}

export interface HoldingsSummary {
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  total_day_change: number;
  total_day_change_percent: number;
  number_of_holdings: number;
  top_gainer?: TopStock;
  top_loser?: TopStock;
}

// Mutual Funds types
export interface MutualFund {
  folio: string;
  fund: string;
  tradingsymbol: string;
  quantity: number;
  average_price: number;
  last_price: number;
  last_price_date: string;
  pnl: number;
  pnl_percent: number;
  current_value: number;
  invested_value: number;
  portfolio_weight: number;
  fund_type: string;
  sip_active: boolean;
}

export interface FundTypeBreakdown {
  value: number;
  weight: number;
}

export interface MFSummary {
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  number_of_funds: number;
  breakdown_by_type: Record<string, FundTypeBreakdown>;
  active_sips: number;
  monthly_sip_amount: number;
}

export interface SIP {
  sip_id: string;
  tradingsymbol: string;
  fund_name: string;
  amount: number;
  frequency: string;
  installments_done: number;
  status: string;
  next_instalment?: string;
}

// Portfolio types
export interface NetWorth {
  total: number;
  equity: number;
  mutual_funds: number;
}

export interface PortfolioOverview {
  net_worth: NetWorth;
  total_invested: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_change: number;
  day_change_percent: number;
  last_updated: string;
}

export interface Position {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  product: string;
}

export interface Snapshot {
  id: number;
  snapshot_date: string;
  total_equity_value: number;
  total_mf_value: number;
  total_pnl: number;
  data?: string;
}

// Buffett scoring types
export interface BuffettStockScore {
  symbol: string;
  score: number;
  grade: string;
  recommended_weight: number;
  breakdown: Record<string, number>;
}

export interface AllocationModel {
  total_budget_example: number;
  invest_in_top_n: number;
  max_single_stock_weight: number;
  weights: Record<string, number>;
}

export interface BuffettResponse {
  scores: BuffettStockScore[];
  allocation_model: AllocationModel;
  last_updated: string;
}

export interface BuffettHoldingVerdict {
  symbol: string;
  score: number;
  grade: string;
  verdict: string;
  breakdown: Record<string, number>;
}

export interface BuffettHoldings {
  holdings: BuffettHoldingVerdict[];
  last_updated: string;
}

// Made with Bob
