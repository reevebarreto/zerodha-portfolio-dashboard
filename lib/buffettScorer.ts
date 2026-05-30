import YahooFinanceAPI from "yahoo-finance2";
import NodeCache from "node-cache";

const yahooFinance = new YahooFinanceAPI();
const cache = new NodeCache({ stdTTL: 86400 }); // 24hr cache

export const NIFTY_50 = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
  "HINDUNILVR",
  "ITC",
  "SBIN",
  "BHARTIARTL",
  "BAJFINANCE",
  "KOTAKBANK",
  "LT",
  "WIPRO",
  "HCLTECH",
  "AXISBANK",
  "ASIANPAINT",
  "MARUTI",
  "NESTLEIND",
  "ULTRACEMCO",
  "TITAN",
  "SUNPHARMA",
  "POWERGRID",
  "NTPC",
  "TECHM",
  "M&M",
  "TATAMOTORS",
  "BAJAJFINSV",
  "ONGC",
  "JSWSTEEL",
  "COALINDIA",
  "BPCL",
  "ADANIENT",
  "GRASIM",
  "DIVISLAB",
  "CIPLA",
  "DRREDDY",
  "HINDALCO",
  "TATACONSUM",
  "APOLLOHOSP",
  "EICHERMOT",
  "HEROMOTOCO",
  "BRITANNIA",
  "SBILIFE",
  "HDFCLIFE",
  "INDUSINDBK",
  "BAJAJ-AUTO",
  "UPL",
  "ADANIPORTS",
  "TATASTEEL",
  "LTI",
];

export interface Fundamentals {
  symbol: string;
  roe: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
  freeCashFlow: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  currentPrice: number | null;
  targetPrice: number | null;
  recommendation: string | null;
  sector: string | null;
  fetchedAt: string;
}

export interface ScoredStock extends Fundamentals {
  score: number;
  grade: "A" | "B" | "C" | "D";
  breakdown: {
    roe: number;
    debtEquity: number;
    margin: number;
    pe: number;
    fcf: number;
    dividend: number;
  };
}

export interface AllocationStock extends ScoredStock {
  weight: number;
  targetAmount: number;
  weightPercent: number;
  capped?: boolean;
}

// yahoo-finance2 uses .NS suffix — no URL encoding needed, it handles M&M correctly
function toYahooSymbol(nse: string): string {
  return `${nse}.NS`;
}

// Fetch fundamentals for a single stock from Yahoo Finance
export async function fetchFundamentals(
  symbol: string,
): Promise<Fundamentals | null> {
  const cacheKey = `fundamentals_${symbol}`;
  const cached = cache.get<Fundamentals>(cacheKey);
  if (cached) return cached;

  try {
    // yahoo-finance2 handles cookies/crumbs internally
    const result = (await yahooFinance.quoteSummary(toYahooSymbol(symbol), {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
    })) as any; // yahoo-finance2 types are complex, using any for simplicity

    const fin = result?.financialData ?? {};
    const keys = result?.defaultKeyStatistics ?? {};
    const sum = result?.summaryDetail ?? {};

    const fundamentals: Fundamentals = {
      symbol,
      // ROE is in financialData, not defaultKeyStatistics
      roe: fin.returnOnEquity ?? null,
      // yahoo-finance2 returns D/E as a clean ratio (not ×100 like the raw API)
      // so NO divide-by-100 needed here anymore
      debtToEquity: fin.debtToEquity ?? null,
      profitMargin: fin.profitMargins ?? null,
      freeCashFlow: fin.freeCashflow ?? null,
      trailingPE: sum.trailingPE ?? null,
      dividendYield: sum.dividendYield ?? null,
      currentPrice: fin.currentPrice ?? null,
      targetPrice: fin.targetMeanPrice ?? null,
      recommendation: fin.recommendationKey ?? null,
      sector: null,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, fundamentals);
    console.log(`[Buffett] ✓ ${symbol}`);
    return fundamentals;
  } catch (err: any) {
    console.warn(`[Buffett] ✗ ${symbol}: ${err.message}`);
    return null;
  }
}

// Score a single stock given its fundamentals
export function scoreStock(
  fundamentals: Fundamentals | null,
): ScoredStock | null {
  if (!fundamentals) return null;

  const {
    roe,
    debtToEquity,
    profitMargin,
    freeCashFlow,
    trailingPE,
    dividendYield,
  } = fundamentals;
  const breakdown = {
    roe: 0,
    debtEquity: 0,
    margin: 0,
    pe: 0,
    fcf: 0,
    dividend: 0,
  };

  // ROE score (out of 20)
  if (roe !== null) {
    if (roe > 0.2) breakdown.roe = 20;
    else if (roe > 0.15) breakdown.roe = 15;
    else if (roe > 0.1) breakdown.roe = 10;
    else breakdown.roe = 5;
  }

  // Debt/Equity score (out of 20)
  if (debtToEquity !== null) {
    if (debtToEquity < 0.3) breakdown.debtEquity = 20;
    else if (debtToEquity < 0.5) breakdown.debtEquity = 15;
    else if (debtToEquity < 1.0) breakdown.debtEquity = 10;
    else breakdown.debtEquity = 5;
  }

  // Net margin score (out of 20)
  if (profitMargin !== null) {
    if (profitMargin > 0.2) breakdown.margin = 20;
    else if (profitMargin > 0.1) breakdown.margin = 15;
    else if (profitMargin > 0.05) breakdown.margin = 10;
    else breakdown.margin = 5;
  }

  // P/E score (out of 20)
  if (trailingPE !== null && trailingPE > 0) {
    if (trailingPE < 15) breakdown.pe = 20;
    else if (trailingPE < 25) breakdown.pe = 15;
    else if (trailingPE < 40) breakdown.pe = 10;
    else breakdown.pe = 5;
  }

  // FCF score (out of 10)
  breakdown.fcf = freeCashFlow !== null && freeCashFlow > 0 ? 10 : 0;

  // Dividend score (out of 10)
  if (dividendYield !== null) {
    if (dividendYield > 0.01) breakdown.dividend = 10;
    else if (dividendYield > 0.005) breakdown.dividend = 7;
    else if (dividendYield > 0) breakdown.dividend = 5;
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const grade: "A" | "B" | "C" | "D" =
    total >= 75 ? "A" : total >= 60 ? "B" : total >= 45 ? "C" : "D";

  return { ...fundamentals, score: total, grade, breakdown };
}

// Score all Nifty 50 stocks (runs in parallel with rate limiting)
export async function scoreAllNifty50(): Promise<ScoredStock[]> {
  const cacheKey = "nifty50_scores";
  const cached = cache.get<ScoredStock[]>(cacheKey);
  if (cached) {
    console.log(`[Buffett] ✓ Returning ${cached.length} cached scores`);
    return cached;
  }

  console.log(
    `[Buffett] 🚀 Starting to score all ${NIFTY_50.length} Nifty 50 stocks...`,
  );
  const startTime = Date.now();

  // Fetch in batches of 5 to avoid rate limiting Yahoo Finance
  const results: ScoredStock[] = [];
  const batchSize = 5;
  const totalBatches = Math.ceil(NIFTY_50.length / batchSize);

  for (let i = 0; i < NIFTY_50.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = NIFTY_50.slice(i, i + batchSize);

    console.log(
      `[Buffett] 📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.join(", ")}`,
    );

    const batchResults = await Promise.allSettled(
      batch.map((symbol) => fetchFundamentals(symbol)),
    );

    let successCount = 0;
    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        const scored = scoreStock(result.value);
        if (scored) {
          results.push(scored);
          successCount++;
        }
      }
    }

    console.log(
      `[Buffett] ✓ Batch ${batchNum}/${totalBatches} complete: ${successCount}/${batch.length} successful`,
    );

    // Small delay between batches
    if (i + batchSize < NIFTY_50.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Buffett] ✅ Scoring complete! ${results.length}/${NIFTY_50.length} stocks scored in ${elapsed}s`,
  );

  results.sort((a, b) => b.score - a.score);
  cache.set(cacheKey, results);

  console.log(`[Buffett] 💾 Cached ${results.length} scores for 24 hours`);
  return results;
}

// Calculate recommended allocation for top N stocks given a budget
export function calculateAllocation(
  scores: ScoredStock[],
  budget: number,
  topN: number = 12,
  maxWeight: number = 0.15,
): AllocationStock[] {
  const top = scores.slice(0, topN);
  const totalScore = top.reduce((s, x) => s + x.score, 0);

  // First pass — raw weights
  let weights: AllocationStock[] = top.map((s) => ({
    ...s,
    weight: s.score / totalScore,
    targetAmount: 0,
    weightPercent: 0,
  }));

  // Cap at maxWeight and redistribute excess
  let excess = 0;
  let uncapped = 0;

  weights = weights.map((w) => {
    if (w.weight > maxWeight) {
      excess += w.weight - maxWeight;
      return { ...w, weight: maxWeight, capped: true };
    }
    uncapped++;
    return { ...w, capped: false };
  });

  // Distribute excess proportionally to uncapped stocks
  if (excess > 0 && uncapped > 0) {
    const extra = excess / uncapped;
    weights = weights.map((w) =>
      w.capped ? w : { ...w, weight: Math.min(maxWeight, w.weight + extra) },
    );
  }

  // Assign amounts
  return weights.map((w) => ({
    ...w,
    targetAmount: Math.round(budget * w.weight),
    weightPercent: parseFloat((w.weight * 100).toFixed(1)),
  }));
}

// Clear the cache (for manual refresh)
export function clearCache(): void {
  cache.flushAll();
}

// Made with Bob
