"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { formatINR, formatINRShort, formatPercent } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ScoredStock {
  symbol: string;
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
  roe: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  currentPrice: number | null;
  recommendation: string | null;
}

interface AllocationStock extends ScoredStock {
  weight: number;
  targetAmount: number;
  weightPercent: number;
}

export default function BuffettPage() {
  const [budget, setBudget] = useState(100000);
  const [topN, setTopN] = useState(12);

  const { data, isLoading, mutate } = useSWR(
    `/api/buffett/scores?budget=${budget}&topN=${topN}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      refreshInterval: (data) => (data?.status === "calculating" ? 5000 : 0),
    },
  );

  const { data: myHoldings } = useSWR("/api/buffett/my-holdings", fetcher);

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

  if (isLoading || data?.status === "calculating") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full" />
        <p className="text-sm text-gray-500">
          Scoring all Nifty 50 stocks against Buffett criteria...
        </p>
        <p className="text-xs text-gray-400">
          This takes ~45 seconds on first load. Results are cached for 24 hours.
        </p>
      </div>
    );
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-text-primary mb-1">
          Buffett Score
        </h1>
        <p className="text-sm text-text-secondary">
          Warren Buffett's principles applied to Nifty 50
        </p>
      </div>

      {/* Controls */}
      <div className="bg-bg-primary border border-border-default rounded-xl p-5 space-y-4">
        {/* Budget input */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block">
            Investment budget
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">₹</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="border border-border-default rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-accent-blue"
              step={10000}
              min={10000}
            />
            {[50000, 100000, 250000, 500000].map((v) => (
              <button
                key={v}
                onClick={() => setBudget(v)}
                className={`text-xs px-3 py-1.5 rounded-lg border border-border-default transition-colors ${
                  budget === v ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                }`}
              >
                {v >= 100000 ? `₹${v / 100000}L` : `₹${v / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {/* TopN slider */}
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
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <span className="text-sm font-medium text-text-primary w-16">
              {topN} stocks
            </span>
          </div>
        </div>
      </div>

      {/* Criteria explanation cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "ROE", desc: "Return on equity >20%", max: 20 },
          { label: "Debt/Equity", desc: "Low debt <0.3", max: 20 },
          { label: "Net Margin", desc: "Profit margin >20%", max: 20 },
          { label: "P/E Ratio", desc: "Fair valuation <15", max: 20 },
          { label: "Free Cash Flow", desc: "Positive FCF", max: 10 },
          { label: "Dividend", desc: "Yield >1%", max: 10 },
        ].map((c) => (
          <div key={c.label} className="bg-bg-secondary rounded-lg p-3">
            <div className="text-xs font-medium text-text-primary mb-1">
              {c.label}
            </div>
            <div className="text-xs text-text-secondary mb-2">{c.desc}</div>
            <div className="text-xs text-text-muted">{c.max} points</div>
          </div>
        ))}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4">
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
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Score
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
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

      {/* My holdings section */}
      {myHoldings?.holdings && myHoldings.holdings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-text-primary">
            My Holdings Analysis
          </h2>
          <div className="space-y-2">
            {myHoldings.holdings
              .filter((h: any) => h.buffettScore)
              .map((h: any) => (
                <MyHoldingCard key={h.tradingsymbol} holding={h} />
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

  return (
    <tr className="border-b border-border-default hover:bg-bg-secondary transition-colors">
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
      <td className="px-4 py-3 text-sm font-medium text-text-primary">
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
        <CriteriaBreakdown breakdown={stock.breakdown} />
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

// Criteria breakdown mini bars
function CriteriaBreakdown({
  breakdown,
}: {
  breakdown: AllocationStock["breakdown"];
}) {
  const criteria = [
    { key: "roe" as const, label: "ROE", max: 20 },
    { key: "debtEquity" as const, label: "D/E", max: 20 },
    { key: "margin" as const, label: "Margin", max: 20 },
    { key: "pe" as const, label: "P/E", max: 20 },
    { key: "fcf" as const, label: "FCF", max: 10 },
    { key: "dividend" as const, label: "Div", max: 10 },
  ];

  function segmentColor(val: number, max: number) {
    const pct = val / max;
    if (pct >= 0.75) return "#639922";
    if (pct >= 0.5) return "#BA7517";
    return "#E24B4A";
  }

  return (
    <div className="flex gap-1">
      {criteria.map((c) => (
        <div
          key={c.key}
          title={`${c.label}: ${breakdown[c.key]}/${c.max}`}
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: segmentColor(breakdown[c.key], c.max) }}
        />
      ))}
    </div>
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

// My holding card component
function MyHoldingCard({ holding }: { holding: any }) {
  const gradeColors: Record<"A" | "B" | "C" | "D", string> = {
    A: "border-accent-green",
    B: "border-accent-blue",
    C: "border-accent-amber",
    D: "border-accent-red",
  };

  const grade = (holding.buffettScore?.grade || "D") as "A" | "B" | "C" | "D";

  const pnlColor =
    holding.currentValue >= holding.investedValue
      ? "text-accent-green"
      : "text-accent-red";
  const pnlPercent =
    ((holding.currentValue - holding.investedValue) / holding.investedValue) *
    100;

  return (
    <div
      className={`bg-bg-primary border-l-4 ${gradeColors[grade]} border-r border-t border-b border-border-default rounded-lg p-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-text-primary">
              {holding.tradingsymbol}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                holding.buffettScore.grade === "A"
                  ? "bg-accent-green text-white"
                  : holding.buffettScore.grade === "B"
                    ? "bg-accent-blue text-white"
                    : holding.buffettScore.grade === "C"
                      ? "bg-accent-amber text-white"
                      : "bg-accent-red text-white"
              }`}
            >
              Grade {holding.buffettScore.grade}
            </span>
            <span className="text-xs text-text-secondary">
              Score: {holding.buffettScore.score}
            </span>
          </div>
          <p className="text-xs text-text-secondary mb-2">{holding.verdict}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-text-secondary">
              Value:{" "}
              <span className="text-text-primary font-medium">
                {formatINRShort(holding.currentValue)}
              </span>
            </span>
            <span className={pnlColor}>{formatPercent(pnlPercent)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
