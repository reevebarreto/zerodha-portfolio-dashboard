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

  // Existing fields
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

  // New fields
  roa: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  fcfToRevenue: number | null;
  interestCoverage: number | null;

  // Historical data
  historicalROE: number[]; // array of ROE values, newest first, up to 3 years
  epsGrowthTrend:
    | "growing"
    | "flat"
    | "mixed"
    | "declining"
    | "negative"
    | null;

  fetchedAt: string;
}

export interface ScoredStock extends Fundamentals {
  score: number;
  grade: "A" | "B" | "C" | "D";
  breakdown: {
    debtEquity: number; // -5 to +15
    currentRatio: number; // -10 to +10
    priceToBook: number; // -5 to +10
    roe: number; // -5 to +10 (current only)
    roeHistorical: number; // -3 to +5
    roa: number; // -5 to +10
    epsGrowth: number; // -5 to +10
    pe: number; // -5 to +10
    fcfRevenue: number; // -5 to +10
    interestCoverage: number; // -7 to +5
    margin: number; // -3 to +5
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

// Helper: Extract value from time series array structure
function getTimeSeriesValue(
  timeSeries: any[],
  field: string,
  index: number = 0,
): number | null {
  try {
    if (!Array.isArray(timeSeries) || timeSeries.length <= index) return null;
    const period = timeSeries[index];
    return period?.[field] ?? null;
  } catch {
    return null;
  }
}

// Helper: Compute historical ROE from income statement and balance sheet arrays
function computeHistoricalROE(
  incomeStatements: any[],
  balanceSheets: any[],
): number[] {
  const roes: number[] = [];
  try {
    if (!Array.isArray(incomeStatements) || !Array.isArray(balanceSheets))
      return [];

    const years = Math.min(incomeStatements.length, balanceSheets.length, 3);
    for (let i = 0; i < years; i++) {
      const netIncome = incomeStatements[i]?.netIncome;
      const equity = balanceSheets[i]?.stockholdersEquity;

      if (netIncome != null && equity != null && equity !== 0) {
        roes.push(netIncome / equity);
      }
    }
  } catch {
    return [];
  }
  return roes;
}

// Helper: Compute EPS growth trend from income statement array
function computeEPSGrowth(
  incomeStatements: any[],
): "growing" | "flat" | "mixed" | "declining" | "negative" | null {
  try {
    if (!Array.isArray(incomeStatements) || incomeStatements.length < 2)
      return null;

    const values = incomeStatements
      .slice(0, 3)
      .map((period: any) => period?.netIncome)
      .filter((v: any) => v != null);

    if (values.length < 2) return null;

    const latest = values[0];
    const previous = values[1];
    const oldest = values[2] ?? previous;

    if (latest < 0) return "negative";
    if (latest > previous && previous > oldest) return "growing";
    if (latest < previous && previous < oldest) return "declining";
    if (Math.abs(latest - previous) / Math.abs(previous) < 0.05) return "flat";
    return "mixed";
  } catch {
    return null;
  }
}

// Fetch fundamentals for a single stock from Yahoo Finance
export async function fetchFundamentals(
  symbol: string,
): Promise<Fundamentals | null> {
  const cacheKey = `fundamentals_${symbol}`;
  const cached = cache.get<Fundamentals>(cacheKey);
  if (cached) return cached;

  try {
    const yahooSymbol = toYahooSymbol(symbol);

    // Fetch quoteSummary for current snapshot data
    const summary = (await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
    })) as any;

    // Fetch fundamentalsTimeSeries for historical data
    // Need THREE separate calls for income statement, balance sheet, and cash flow
    let incomeStatements: any[] = [];
    let balanceSheets: any[] = [];
    let cashFlows: any[] = [];

    const period1 = new Date(Date.now() - 4 * 365 * 24 * 60 * 60 * 1000); // 4 years ago
    const period2 = new Date();

    try {
      // Fetch income statement
      const incomeResult = await yahooFinance.fundamentalsTimeSeries(
        yahooSymbol,
        {
          module: "financials",
          period1,
          period2,
          type: "annual",
        },
      );
      if (Array.isArray(incomeResult)) incomeStatements = incomeResult;

      // Fetch balance sheet
      const balanceResult = await yahooFinance.fundamentalsTimeSeries(
        yahooSymbol,
        {
          module: "balance-sheet",
          period1,
          period2,
          type: "annual",
        },
      );
      if (Array.isArray(balanceResult)) balanceSheets = balanceResult;

      // Fetch cash flow
      const cashFlowResult = await yahooFinance.fundamentalsTimeSeries(
        yahooSymbol,
        {
          module: "cash-flow",
          period1,
          period2,
          type: "annual",
        },
      );
      if (Array.isArray(cashFlowResult)) cashFlows = cashFlowResult;

      console.log(
        `[Buffett] ${symbol} - Fetched ${incomeStatements.length} income, ${balanceSheets.length} balance, ${cashFlows.length} cashflow periods`,
      );
    } catch (err: any) {
      console.warn(
        `[Buffett] Could not fetch time series for ${symbol}:`,
        err.message,
      );
    }

    const fin = summary?.financialData ?? {};
    const keys = summary?.defaultKeyStatistics ?? {};
    const sum = summary?.summaryDetail ?? {};

    // Current Ratio: Use quoteSummary value (more reliable than calculating from time series)
    const currentRatio: number | null = fin.currentRatio ?? null;

    // FCF/Revenue from cash flow and income statement
    let fcfToRevenue: number | null = null;
    if (cashFlows.length > 0 && incomeStatements.length > 0) {
      const operatingCF = cashFlows[0]?.operatingCashFlow;
      const capex = cashFlows[0]?.capitalExpenditure; // negative value
      const revenue = incomeStatements[0]?.totalRevenue;
      if (operatingCF != null && revenue != null && revenue !== 0) {
        const fcf = operatingCF + (capex ?? 0); // capex is negative, so this subtracts
        fcfToRevenue = fcf / revenue;
      }
    }

    // Interest Coverage from income statement
    let interestCoverage: number | null = null;
    if (incomeStatements.length > 0) {
      const ebitda = incomeStatements[0]?.EBITDA;
      const depreciation = incomeStatements[0]?.reconciledDepreciation;
      const interestExpense = incomeStatements[0]?.interestExpense;

      // Calculate EBIT from EBITDA - Depreciation
      const ebit =
        ebitda != null && depreciation != null ? ebitda - depreciation : null;

      if (ebit != null) {
        if (!interestExpense || interestExpense === 0) {
          interestCoverage = 999; // no debt
        } else {
          interestCoverage = ebit / Math.abs(interestExpense);
        }
      }
    }

    const fundamentals: Fundamentals = {
      symbol,

      // Existing fields from quoteSummary
      roe: fin.returnOnEquity ?? keys.returnOnEquity ?? null,
      debtToEquity: fin.debtToEquity ?? null,
      profitMargin: fin.profitMargins ?? keys.profitMargins ?? null,
      freeCashFlow: fin.freeCashflow ?? null,
      trailingPE: sum.trailingPE ?? keys.trailingPE ?? null,
      dividendYield: sum.dividendYield ?? keys.dividendYield ?? null,
      currentPrice: fin.currentPrice ?? sum.regularMarketPrice ?? null,
      targetPrice: fin.targetMeanPrice ?? null,
      recommendation: fin.recommendationKey ?? null,
      sector: null,

      // New scalar fields
      roa: keys.returnOnAssets ?? fin.returnOnAssets ?? null,
      priceToBook: sum.priceToBook ?? keys.priceToBook ?? null,

      // From time series array
      currentRatio,
      fcfToRevenue,
      interestCoverage,

      // Historical from time series arrays
      historicalROE:
        incomeStatements.length > 0 && balanceSheets.length > 0
          ? computeHistoricalROE(incomeStatements, balanceSheets)
          : [],
      epsGrowthTrend:
        incomeStatements.length > 0 ? computeEPSGrowth(incomeStatements) : null,

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
export function scoreStock(f: Fundamentals | null): ScoredStock | null {
  if (!f) return null;

  const b = {
    debtEquity: 0,
    currentRatio: 0,
    priceToBook: 0,
    roe: 0,
    roeHistorical: 0,
    roa: 0,
    epsGrowth: 0,
    pe: 0,
    fcfRevenue: 0,
    interestCoverage: 0,
    margin: 0,
  };

  // 1. Debt / Equity (max +15, min -5)
  if (f.debtToEquity !== null) {
    if (f.debtToEquity < 0.3) b.debtEquity = 15;
    else if (f.debtToEquity < 0.5) b.debtEquity = 10;
    else if (f.debtToEquity < 1.0) b.debtEquity = 5;
    else if (f.debtToEquity < 2.0) b.debtEquity = 0;
    else b.debtEquity = -5;
  }

  // 2. Current Ratio (max +10, min -10)
  if (f.currentRatio !== null) {
    const cr = f.currentRatio;
    if (cr >= 1.5 && cr <= 2.5) b.currentRatio = 10;
    else if (cr >= 1.0 && cr < 1.5) b.currentRatio = 5;
    else if (cr > 2.5 && cr <= 3.5) b.currentRatio = 5;
    else if (cr > 3.5 && cr <= 5.0) b.currentRatio = 2;
    else if (cr > 5.0) b.currentRatio = 0;
    else if (cr >= 0.5) b.currentRatio = -5;
    else b.currentRatio = -10;
  }

  // 3. Price / Book (max +10, min -5)
  if (f.priceToBook !== null) {
    const pb = f.priceToBook;
    if (pb < 1.5) b.priceToBook = 10;
    else if (pb < 3.0) b.priceToBook = 7;
    else if (pb < 5.0) b.priceToBook = 4;
    else if (pb < 10.0) b.priceToBook = 1;
    else b.priceToBook = -5;
  }

  // 4a. ROE current (max +10, min -5)
  if (f.roe !== null) {
    if (f.roe > 0.25) b.roe = 10;
    else if (f.roe > 0.15) b.roe = 7;
    else if (f.roe > 0.08) b.roe = 4;
    else if (f.roe >= 0) b.roe = 0;
    else b.roe = -5;
  }

  // 4b. ROE historical consistency (max +5, min -3)
  if (f.historicalROE.length >= 2) {
    const allAbove8 = f.historicalROE.every((r) => r > 0.08);
    const atLeast2Above8 = f.historicalROE.filter((r) => r > 0.08).length >= 2;

    // Check trend: newest first, so declining = each value smaller than the previous
    const declining =
      f.historicalROE.length >= 2 &&
      f.historicalROE[0] < f.historicalROE[1] * 0.8 && // >20% drop year over year
      (f.historicalROE.length < 3 ||
        f.historicalROE[1] < f.historicalROE[2] * 0.8);

    if (allAbove8 && !declining) b.roeHistorical = 5;
    else if (atLeast2Above8) b.roeHistorical = 2;
    else if (declining) b.roeHistorical = -3;
  }

  // 5. ROA (max +10, min -5)
  if (f.roa !== null) {
    if (f.roa > 0.12) b.roa = 10;
    else if (f.roa > 0.06) b.roa = 6;
    else if (f.roa > 0.03) b.roa = 2;
    else if (f.roa >= 0) b.roa = 0;
    else b.roa = -5;
  }

  // 6. EPS Growth (max +10, min -5)
  switch (f.epsGrowthTrend) {
    case "growing":
      b.epsGrowth = 10;
      break;
    case "flat":
      b.epsGrowth = 5;
      break;
    case "mixed":
      b.epsGrowth = 2;
      break;
    case "declining":
      b.epsGrowth = -3;
      break;
    case "negative":
      b.epsGrowth = -5;
      break;
    default:
      b.epsGrowth = 0;
  }

  // 7. P/E Ratio (max +10, min -5)
  if (f.trailingPE !== null) {
    const pe = f.trailingPE;
    if (pe > 0 && pe < 15) b.pe = 10;
    else if (pe < 25) b.pe = 7;
    else if (pe < 40) b.pe = 3;
    else if (pe < 60) b.pe = 0;
    else if (pe >= 60) b.pe = -3;
    else b.pe = -5; // negative P/E = loss-making
  }

  // 8. FCF / Revenue (max +10, min -5)
  if (f.fcfToRevenue !== null) {
    if (f.fcfToRevenue > 0.15) b.fcfRevenue = 10;
    else if (f.fcfToRevenue > 0.05) b.fcfRevenue = 7;
    else if (f.fcfToRevenue > 0) b.fcfRevenue = 2;
    else b.fcfRevenue = -5;
  }

  // 9. Interest Coverage (max +5, min -7)
  if (f.interestCoverage !== null) {
    const ic = f.interestCoverage;
    if (ic >= 999)
      b.interestCoverage = 5; // no debt
    else if (ic > 10) b.interestCoverage = 5;
    else if (ic > 5) b.interestCoverage = 3;
    else if (ic > 2) b.interestCoverage = 1;
    else if (ic > 1) b.interestCoverage = -3;
    else b.interestCoverage = -7;
  }

  // 10. Net Profit Margin (max +5, min -3)
  if (f.profitMargin !== null) {
    if (f.profitMargin > 0.2) b.margin = 5;
    else if (f.profitMargin > 0.1) b.margin = 3;
    else if (f.profitMargin > 0.05) b.margin = 1;
    else if (f.profitMargin >= 0) b.margin = 0;
    else b.margin = -3;
  }

  const total = Object.values(b).reduce((a, v) => a + v, 0);
  const grade: "A" | "B" | "C" | "D" =
    total >= 65 ? "A" : total >= 50 ? "B" : total >= 35 ? "C" : "D";

  return { ...f, score: total, grade, breakdown: b };
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
  // Filter out stocks with score <= 0 to prevent negative weights
  const eligible = scores.filter((s) => s.score > 0);
  const top = eligible.slice(0, topN);
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
