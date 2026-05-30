"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { formatINR, formatINRShort, formatPercent } from "@/lib/format";
import { BuffettLoadingFeed } from "@/components/BuffettLoadingFeed";
import { CriteriaSquare } from "@/components/CriteriaSquare";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ScoredStock {
  symbol: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  breakdown: {
    debtEquity: number;
    currentRatio: number;
    priceToBook: number;
    roe: number;
    roeHistorical: number;
    roa: number;
    epsGrowth: number;
    pe: number;
    fcfRevenue: number;
    interestCoverage: number;
    margin: number;
  };
  // Fundamentals
  roe: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  freeCashFlow: number | null;
  currentPrice: number | null;
  roa: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  fcfToRevenue: number | null;
  interestCoverage: number | null;
  historicalROE: number[];
  epsGrowthTrend:
    | "growing"
    | "flat"
    | "mixed"
    | "declining"
    | "negative"
    | null;
  recommendation: string | null;
  priceChange1D: number | null;
  priceChange1M: number | null;
  priceChange1Y: number | null;
  priceChange5Y: number | null;
}

interface AllocationStock extends ScoredStock {
  weight: number;
  targetAmount: number;
  weightPercent: number;
}

export default function BuffettPage() {
  // Separate slider display value from committed value
  const [budgetInput, setBudgetInput] = useState(100000);
  const [budget, setBudget] = useState(100000);
  const [sliderVal, setSliderVal] = useState(12);
  const [topN, setTopN] = useState(12);

  // Budget debounce with 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => setBudget(budgetInput), 400);
    return () => clearTimeout(timer);
  }, [budgetInput]);

  const router = useRouter();

  // Fetch Buffett scores with proper caching and session handling
  const { data, isLoading, mutate } = useSWR(
    `buffett/scores/${budget}/${topN}`,
    () => api.buffett.scores(budget, topN),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Don't refetch within 1 minute
      refreshInterval: (data) => (data?.status === "calculating" ? 5000 : 0),
      onError: (error) => {
        // Handle session expiry
        if (
          error?.message?.includes("Session expired") ||
          error?.message?.includes("Authentication failed")
        ) {
          router.push("/login");
        }
      },
    },
  );

  // Fetch user's holdings with proper caching and session handling
  const { data: myHoldings } = useSWR(
    "buffett/my-holdings",
    () => api.buffett.myHoldings(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // Don't refetch within 5 minutes
      onError: (error) => {
        // Handle session expiry
        if (
          error?.message?.includes("Session expired") ||
          error?.message?.includes("Authentication failed")
        ) {
          router.push("/login");
        }
      },
    },
  );

  // Use allocation from API (already calculated server-side)
  const allocation = data?.scores || [];

  // Create a map of holdings for quick lookup
  const holdingsMap = useMemo(() => {
    if (!myHoldings?.holdings) return {};
    return Object.fromEntries(
      myHoldings.holdings.map((h: any) => [h.tradingsymbol, h]),
    );
  }, [myHoldings]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!allocation.length) return { selected: 0, invested: 0, remaining: 0 };

    const invested = allocation.reduce((sum: number, stock: any) => {
      const holding = holdingsMap[stock.symbol];
      return sum + (holding?.currentValue || 0);
    }, 0);

    return {
      selected: allocation.length,
      invested,
      remaining: budget - invested,
    };
  }, [allocation, holdingsMap, budget]);

  // Use BuffettLoadingFeed component
  if (isLoading || data?.status === "calculating") {
    return <BuffettLoadingFeed onComplete={() => mutate()} />;
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-500">
          Could not fetch fundamentals from Yahoo Finance.
        </p>
        <button
          onClick={() => mutate()}
          className="mt-3 text-sm border border-border-default rounded-lg px-4 py-2 hover:bg-bg-tertiary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 m-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-text-primary mb-1">
          Buffett Score
        </h1>
        <p className="text-sm text-text-secondary">
          Warren Buffett's principles applied to Nifty 50
        </p>
      </div>

      {/* Updated info callout with new grade thresholds */}
      <div
        style={{
          background: "var(--color-background-secondary)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--color-text-secondary)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <p style={{ lineHeight: 1.5 }}>
          <strong>Grades:</strong> A = 65+, B = 50–64, C = 35–49, D = {"<"}35.
          Scores can go negative for stocks that fail multiple criteria.
        </p>
      </div>

      {/* Controls */}
      <div
        className="bg-bg-primary border border-border-default rounded-xl p-5 space-y-4"
        style={{ marginBottom: 32 }}
      >
        {/* Budget input */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block">
            Investment budget
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">₹</span>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(Number(e.target.value))}
              className="border border-border-default rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-accent-blue"
              step={10000}
              min={10000}
            />
            {[50000, 100000, 250000, 500000].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setBudgetInput(v);
                  setBudget(v);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border border-border-default transition-colors ${
                  budget === v ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                }`}
              >
                {v >= 100000 ? `₹${v / 100000}L` : `₹${v / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {/* TopN slider - Debounced */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block">
            Number of stocks to invest in
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Top</span>
            <input
              type="range"
              min={5}
              max={20}
              step={1}
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              onMouseUp={(e) =>
                setTopN(Number((e.target as HTMLInputElement).value))
              }
              onTouchEnd={(e) =>
                setTopN(Number((e.target as HTMLInputElement).value))
              }
              className="flex-1 max-w-xs"
            />
            <span className="text-sm font-medium text-text-primary w-20 flex items-center gap-2">
              {sliderVal} stocks
              {sliderVal !== topN && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Criteria explanation cards - Updated for 11 criteria */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        style={{ gap: 10, marginBottom: 28 }}
      >
        {[
          { label: "Debt/Equity", desc: "Low debt <0.3", max: 15 },
          { label: "Current Ratio", desc: "Liquidity 1.5–2.5", max: 10 },
          { label: "Price/Book", desc: "Value <1.5", max: 10 },
          { label: "ROE", desc: "Return >25%", max: 10 },
          { label: "ROE Trend", desc: "Consistent 3yr", max: 5 },
          { label: "ROA", desc: "Asset return >12%", max: 10 },
          { label: "EPS Growth", desc: "Growing trend", max: 10 },
          { label: "P/E Ratio", desc: "Fair value <15", max: 10 },
          { label: "FCF/Revenue", desc: "Cash gen >15%", max: 10 },
          { label: "Interest Cov", desc: "Debt service >10×", max: 5 },
          { label: "Net Margin", desc: "Profit >20%", max: 5 },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-bg-secondary rounded-lg"
            style={{ padding: "14px 16px" }}
          >
            <div className="text-xs font-medium text-text-primary mb-1">
              {c.label}
            </div>
            <div className="text-xs text-text-secondary mb-2">{c.desc}</div>
            <div className="text-xs text-text-muted">{c.max} points</div>
          </div>
        ))}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Stocks selected</p>
          <p className="text-2xl font-medium text-text-primary">
            {summary.selected}
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Already invested</p>
          <p className="text-2xl font-medium text-text-primary">
            {formatINRShort(summary.invested)}
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Still to deploy</p>
          <p className="text-2xl font-medium text-text-primary">
            {formatINRShort(summary.remaining)}
          </p>
        </div>
      </div>

      {/* Main allocation table */}
      <div className="bg-bg-primary border border-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border-default">
              <tr>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Symbol
                </th>
                <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                  Price
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Trends
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Score
                </th>
                <th
                  className="text-left text-xs font-medium text-text-secondary px-4 py-3"
                  title="A = 65+, B = 50–64, C = 35–49, D = <35"
                  style={{ cursor: "help" }}
                >
                  Grade
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Criteria
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Allocation
                </th>
                <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                  Weight
                </th>
                <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {allocation.map((stock: any, idx: number) => {
                const holding = holdingsMap[stock.symbol];
                const investedAmount = holding?.currentValue || 0;
                const pct = Math.min(
                  100,
                  Math.round((investedAmount / stock.targetAmount) * 100),
                );

                return (
                  <AllocationRow
                    key={stock.symbol}
                    rank={idx + 1}
                    stock={stock}
                    investedAmount={investedAmount}
                    progressPercent={pct}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My holdings section - Redesigned cards */}
      {myHoldings?.holdings && myHoldings.holdings.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2 className="text-lg font-medium text-text-primary mb-4">
            My Holdings Analysis
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
              gap: 16,
            }}
          >
            {myHoldings.holdings
              .filter((h: any) => h.buffettScore)
              .map((h: any) => (
                <MyHoldingCard
                  key={h.tradingsymbol}
                  holding={h}
                  allocation={data}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Allocation row component
function AllocationRow({
  rank,
  stock,
  investedAmount,
  progressPercent,
}: {
  rank: number;
  stock: AllocationStock;
  investedAmount: number;
  progressPercent: number;
}) {
  const barColor =
    progressPercent >= 100
      ? "#639922"
      : progressPercent >= 50
        ? "#1D9E75"
        : "#378ADD";

  const gradeColors = {
    A: "bg-accent-green text-white",
    B: "bg-accent-blue text-white",
    C: "bg-accent-amber text-white",
    D: "bg-accent-red text-white",
  };

  // Build criteria values for tooltips - ALL 11 CRITERIA
  const criteriaValues = [
    // Group 1: Valuation
    {
      key: "debtEquity",
      label: "Debt / Equity",
      score: stock.breakdown.debtEquity,
      max: 15,
      value:
        stock.debtToEquity !== null ? stock.debtToEquity.toFixed(2) : "N/A",
    },
    {
      key: "currentRatio",
      label: "Current Ratio",
      score: stock.breakdown.currentRatio,
      max: 10,
      value:
        stock.currentRatio !== null ? stock.currentRatio.toFixed(2) : "N/A",
    },
    {
      key: "priceToBook",
      label: "Price / Book",
      score: stock.breakdown.priceToBook,
      max: 10,
      value:
        stock.priceToBook !== null ? `${stock.priceToBook.toFixed(1)}×` : "N/A",
    },
    // Group 2: Profitability
    {
      key: "roe",
      label: "Return on Equity",
      score: stock.breakdown.roe,
      max: 10,
      value: stock.roe !== null ? `${(stock.roe * 100).toFixed(1)}%` : "N/A",
    },
    {
      key: "roeHistorical",
      label: "ROE Trend",
      score: stock.breakdown.roeHistorical,
      max: 5,
      value:
        stock.historicalROE.length >= 2
          ? stock.historicalROE.every((r) => r > 0.08)
            ? "Consistent (3 yrs)"
            : stock.historicalROE.filter((r) => r > 0.08).length >= 2
              ? "Mostly positive"
              : "Declining"
          : "Insufficient data",
    },
    {
      key: "roa",
      label: "Return on Assets",
      score: stock.breakdown.roa,
      max: 10,
      value: stock.roa !== null ? `${(stock.roa * 100).toFixed(1)}%` : "N/A",
    },
    // Group 3: Growth
    {
      key: "epsGrowth",
      label: "EPS Growth",
      score: stock.breakdown.epsGrowth,
      max: 10,
      value: stock.epsGrowthTrend
        ? stock.epsGrowthTrend === "growing"
          ? "Growing ✓"
          : stock.epsGrowthTrend === "declining"
            ? "Declining ✗"
            : stock.epsGrowthTrend === "negative"
              ? "Negative ✗"
              : stock.epsGrowthTrend === "flat"
                ? "Flat"
                : "Mixed"
        : "N/A",
    },
    {
      key: "pe",
      label: "P/E Ratio",
      score: stock.breakdown.pe,
      max: 10,
      value:
        stock.trailingPE !== null ? `${stock.trailingPE.toFixed(1)}×` : "N/A",
    },
    // Group 4: Cash & Margins
    {
      key: "fcfRevenue",
      label: "FCF / Revenue",
      score: stock.breakdown.fcfRevenue,
      max: 10,
      value:
        stock.fcfToRevenue !== null
          ? `${(stock.fcfToRevenue * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "interestCoverage",
      label: "Interest Coverage",
      score: stock.breakdown.interestCoverage,
      max: 5,
      value:
        stock.interestCoverage !== null
          ? stock.interestCoverage >= 999
            ? "No debt ✓"
            : `${stock.interestCoverage.toFixed(1)}×`
          : "N/A",
    },
    {
      key: "margin",
      label: "Net Margin",
      score: stock.breakdown.margin,
      max: 5,
      value:
        stock.profitMargin !== null
          ? `${(stock.profitMargin * 100).toFixed(1)}%`
          : "N/A",
    },
  ];

  // Score color: green ≥65, red <0, default otherwise
  const scoreColor =
    stock.score >= 65 ? "#639922" : stock.score < 0 ? "#E24B4A" : "inherit";

  return (
    <tr
      className="border-b border-border-default hover:bg-bg-secondary transition-colors"
      style={{ padding: "14px 0" }}
    >
      <td className="px-4 py-3 text-sm text-text-secondary">{rank}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {stock.symbol}
          </span>
          {investedAmount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
              held
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm text-text-primary">
        {stock.currentPrice !== null
          ? `₹${stock.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
          : "—"}
      </td>
      <td className="px-4 py-3">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { label: "1D", value: stock.priceChange1D },
            { label: "1M", value: stock.priceChange1M },
            { label: "1Y", value: stock.priceChange1Y },
            { label: "5Y", value: stock.priceChange5Y },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <span
                className="text-xs text-text-secondary"
                style={{ width: 20 }}
              >
                {label}
              </span>
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    value === null
                      ? "#9b9b9b"
                      : value >= 0
                        ? "#16a34a"
                        : "#dc2626",
                }}
              >
                {value !== null ? formatPercent(value) : "—"}
              </span>
            </div>
          ))}
        </div>
      </td>
      <td
        className="px-4 py-3 text-sm font-medium"
        style={{ color: scoreColor }}
      >
        {stock.score}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-1 rounded ${gradeColors[stock.grade]}`}
        >
          {stock.grade}
        </span>
      </td>
      <td className="px-4 py-3">
        {/* 11 criteria squares with visual grouping */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Group 1: Valuation (D/E, CR, P/B) */}
          {criteriaValues.slice(0, 3).map((c) => (
            <CriteriaSquare
              key={c.key}
              score={c.score}
              max={c.max}
              label={c.label}
              value={c.value}
            />
          ))}
          <div
            style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }}
          />

          {/* Group 2: Profitability (ROE, ROE↗, ROA) */}
          {criteriaValues.slice(3, 6).map((c) => (
            <CriteriaSquare
              key={c.key}
              score={c.score}
              max={c.max}
              label={c.label}
              value={c.value}
            />
          ))}
          <div
            style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }}
          />

          {/* Group 3: Growth (EPS, P/E) */}
          {criteriaValues.slice(6, 8).map((c) => (
            <CriteriaSquare
              key={c.key}
              score={c.score}
              max={c.max}
              label={c.label}
              value={c.value}
            />
          ))}
          <div
            style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }}
          />

          {/* Group 4: Cash & Margins (FCF/R, IC, Margin) */}
          {criteriaValues.slice(8, 11).map((c) => (
            <CriteriaSquare
              key={c.key}
              score={c.score}
              max={c.max}
              label={c.label}
              value={c.value}
            />
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <ProgressBar
          invested={investedAmount}
          target={stock.targetAmount}
          percent={progressPercent}
          color={barColor}
        />
      </td>
      <td className="px-4 py-3 text-right text-sm text-text-primary">
        {stock.weightPercent}%
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-text-primary">
        {formatINRShort(stock.targetAmount)}
      </td>
    </tr>
  );
}

// Progress bar component
function ProgressBar({
  invested,
  target,
  percent,
  color,
}: {
  invested: number;
  target: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-text-secondary">
        {formatINRShort(invested)} / {formatINRShort(target)} ({percent}%)
      </p>
    </div>
  );
}

// Redesigned My Holding Card with +X / −Y breakdown
function MyHoldingCard({
  holding,
  allocation,
}: {
  holding: any;
  allocation: any;
}) {
  const gradeColors: Record<"A" | "B" | "C" | "D", string> = {
    A: "#639922",
    B: "#378ADD",
    C: "#BA7517",
    D: "#E24B4A",
  };

  const grade = (holding.buffettScore?.grade || "D") as "A" | "B" | "C" | "D";

  const pnlColor =
    holding.currentValue >= holding.investedValue
      ? "text-accent-green"
      : "text-accent-red";
  const pnl = holding.currentValue - holding.investedValue;
  const pnlPercent = (pnl / holding.investedValue) * 100;

  // Calculate +X / −Y breakdown
  const positivePoints = Object.values(holding.buffettScore.breakdown)
    .filter((v: any) => v > 0)
    .reduce((a: number, b: any) => a + b, 0);
  const negativePoints = Object.values(holding.buffettScore.breakdown)
    .filter((v: any) => v < 0)
    .reduce((a: number, b: any) => a + b, 0);

  // Build criteria values for this holding - ALL 11 CRITERIA
  const criteriaValues = [
    {
      key: "debtEquity",
      label: "D/E",
      score: holding.buffettScore.breakdown.debtEquity,
      max: 15,
      value:
        holding.buffettScore.debtToEquity !== null
          ? holding.buffettScore.debtToEquity.toFixed(2)
          : "N/A",
    },
    {
      key: "currentRatio",
      label: "CR",
      score: holding.buffettScore.breakdown.currentRatio,
      max: 10,
      value:
        holding.buffettScore.currentRatio !== null
          ? holding.buffettScore.currentRatio.toFixed(2)
          : "N/A",
    },
    {
      key: "priceToBook",
      label: "P/B",
      score: holding.buffettScore.breakdown.priceToBook,
      max: 10,
      value:
        holding.buffettScore.priceToBook !== null
          ? `${holding.buffettScore.priceToBook.toFixed(1)}×`
          : "N/A",
    },
    {
      key: "roe",
      label: "ROE",
      score: holding.buffettScore.breakdown.roe,
      max: 10,
      value:
        holding.buffettScore.roe !== null
          ? `${(holding.buffettScore.roe * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "roeHistorical",
      label: "ROE↗",
      score: holding.buffettScore.breakdown.roeHistorical,
      max: 5,
      value:
        holding.buffettScore.historicalROE.length >= 2
          ? holding.buffettScore.historicalROE.every((r: number) => r > 0.08)
            ? "Consistent"
            : "Mixed"
          : "N/A",
    },
    {
      key: "roa",
      label: "ROA",
      score: holding.buffettScore.breakdown.roa,
      max: 10,
      value:
        holding.buffettScore.roa !== null
          ? `${(holding.buffettScore.roa * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "epsGrowth",
      label: "EPS",
      score: holding.buffettScore.breakdown.epsGrowth,
      max: 10,
      value: holding.buffettScore.epsGrowthTrend
        ? holding.buffettScore.epsGrowthTrend === "growing"
          ? "Growing ✓"
          : holding.buffettScore.epsGrowthTrend === "declining"
            ? "Declining ✗"
            : "Mixed"
        : "N/A",
    },
    {
      key: "pe",
      label: "P/E",
      score: holding.buffettScore.breakdown.pe,
      max: 10,
      value:
        holding.buffettScore.trailingPE !== null
          ? `${holding.buffettScore.trailingPE.toFixed(1)}×`
          : "N/A",
    },
    {
      key: "fcfRevenue",
      label: "FCF/R",
      score: holding.buffettScore.breakdown.fcfRevenue,
      max: 10,
      value:
        holding.buffettScore.fcfToRevenue !== null
          ? `${(holding.buffettScore.fcfToRevenue * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "interestCoverage",
      label: "IC",
      score: holding.buffettScore.breakdown.interestCoverage,
      max: 5,
      value:
        holding.buffettScore.interestCoverage !== null
          ? holding.buffettScore.interestCoverage >= 999
            ? "No debt ✓"
            : `${holding.buffettScore.interestCoverage.toFixed(1)}×`
          : "N/A",
    },
    {
      key: "margin",
      label: "Margin",
      score: holding.buffettScore.breakdown.margin,
      max: 5,
      value:
        holding.buffettScore.profitMargin !== null
          ? `${(holding.buffettScore.profitMargin * 100).toFixed(1)}%`
          : "N/A",
    },
  ];

  return (
    <div
      style={{
        borderLeft: `4px solid ${gradeColors[grade]}`,
        borderRadius: 12,
        padding: 20,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
      }}
    >
      {/* Row 1 - Header with +X / −Y breakdown */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 500 }}>
          {holding.tradingsymbol}
        </span>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: gradeColors[grade],
            color: "white",
            fontWeight: 500,
          }}
        >
          {grade}
        </span>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Score: {holding.buffettScore.score}
        </span>
        {/* +X / −Y breakdown */}
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          <span style={{ color: "#639922" }}>+{positivePoints}</span>
          {" / "}
          <span style={{ color: "#E24B4A" }}>−{Math.abs(negativePoints)}</span>
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "var(--color-text-secondary)",
          }}
        >
          {holding.verdict}
        </span>
      </div>

      {/* Row 2 - Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Metric
          label="Current value"
          value={formatINRShort(holding.currentValue)}
        />
        <Metric
          label="Invested"
          value={formatINRShort(holding.investedValue)}
        />
        <Metric label="P&L" value={formatINRShort(pnl)} colored pnl={pnl} />
        <Metric
          label="Return"
          value={formatPercent(pnlPercent)}
          colored
          pnl={pnl}
        />
      </div>

      {/* Row 3 - Criteria + Allocation Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {criteriaValues.map((c) => (
            <CriteriaSquare
              key={c.key}
              score={c.score}
              max={c.max}
              label={c.label}
              value={c.value}
            />
          ))}
        </div>
        <AllocationStatus
          symbol={holding.tradingsymbol}
          allocation={allocation}
          investedAmount={holding.currentValue}
        />
      </div>
    </div>
  );
}

// Metric component for holding cards
function Metric({
  label,
  value,
  colored,
  pnl,
}: {
  label: string;
  value: string;
  colored?: boolean;
  pnl?: number;
}) {
  const color =
    colored && pnl !== undefined
      ? pnl >= 0
        ? "var(--color-accent-green)"
        : "var(--color-accent-red)"
      : "var(--color-text-primary)";

  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: "var(--color-text-secondary)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 500, color }}>{value}</p>
    </div>
  );
}

// Allocation status component
function AllocationStatus({
  symbol,
  allocation,
  investedAmount,
}: {
  symbol: string;
  allocation: any;
  investedAmount: number;
}) {
  const match = allocation?.scores?.find((s: any) => s.symbol === symbol);
  if (!match) {
    return (
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        Not in current top {allocation?.meta?.topN} model
      </span>
    );
  }

  const pct = Math.min(
    100,
    Math.round((investedAmount / match.targetAmount) * 100),
  );
  const rank = allocation.scores.findIndex((s: any) => s.symbol === symbol) + 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "flex-end",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        Rank #{rank} · Target {formatINRShort(match.targetAmount)}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 100,
            height: 4,
            background: "var(--color-background-tertiary)",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "#378ADD",
              borderRadius: 2,
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{pct}%</span>
      </div>
    </div>
  );
}

// Made with Bob
