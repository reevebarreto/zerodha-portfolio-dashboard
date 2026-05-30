"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { formatINR, formatINRShort, formatPercent } from "@/lib/format";
import { BuffettLoadingFeed } from "@/components/BuffettLoadingFeed";
import { CriteriaSquare } from "@/components/CriteriaSquare";

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
  freeCashFlow: number | null;
  currentPrice: number | null;
  recommendation: string | null;
}

interface AllocationStock extends ScoredStock {
  weight: number;
  targetAmount: number;
  weightPercent: number;
}

export default function BuffettPage() {
  // Change 3: Separate slider display value from committed value
  const [budgetInput, setBudgetInput] = useState(100000);
  const [budget, setBudget] = useState(100000);
  const [sliderVal, setSliderVal] = useState(12);
  const [topN, setTopN] = useState(12);

  // Change 3: Budget debounce with 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => setBudget(budgetInput), 400);
    return () => clearTimeout(timer);
  }, [budgetInput]);

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

  // Change 4: Use BuffettLoadingFeed component
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
    <div className="space-y-6 m-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-text-primary mb-1">
          Buffett Score
        </h1>
        <p className="text-sm text-text-secondary">
          Warren Buffett's principles applied to Nifty 50
        </p>
      </div>

      {/* Change 1: Info callout explaining B/C grades */}
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
          Most Nifty 50 stocks score B or C. This is expected — Indian markets
          trade at premium valuations, which lowers the P/E score. A score above
          55 is strong in the Indian context.
        </p>
      </div>

      {/* Controls - Change 2: Added margin-bottom: 32px */}
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

        {/* TopN slider - Change 3: Debounced */}
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

      {/* Criteria explanation cards - Change 2: Increased padding and gap */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        style={{ gap: 10, marginBottom: 28 }}
      >
        {[
          { label: "ROE", desc: "Return on equity >20%", max: 20 },
          { label: "Debt/Equity", desc: "Low debt <0.3", max: 20 },
          { label: "Net Margin", desc: "Profit margin >20%", max: 20 },
          { label: "P/E Ratio", desc: "Fair valuation <15", max: 20 },
          { label: "Free Cash Flow", desc: "Positive FCF", max: 10 },
          { label: "Dividend", desc: "Yield >1%", max: 10 },
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

      {/* Summary metrics - Change 2: Added margin-bottom: 24px */}
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
                {/* Change 6: Added Price column */}
                <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                  Price
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  Score
                </th>
                <th
                  className="text-left text-xs font-medium text-text-secondary px-4 py-3"
                  title="A = 75+, B = 60–74, C = 45–59, D = <45"
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

      {/* My holdings section - Change 7: Redesigned cards */}
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

  // Change 5: Build criteria values for tooltips
  const criteriaValues = [
    {
      key: "roe",
      label: "Return on Equity",
      score: stock.breakdown.roe,
      max: 20,
      value: stock.roe !== null ? `${(stock.roe * 100).toFixed(1)}%` : "N/A",
    },
    {
      key: "debtEquity",
      label: "Debt / Equity",
      score: stock.breakdown.debtEquity,
      max: 20,
      value:
        stock.debtToEquity !== null ? stock.debtToEquity.toFixed(2) : "N/A",
    },
    {
      key: "margin",
      label: "Net Margin",
      score: stock.breakdown.margin,
      max: 20,
      value:
        stock.profitMargin !== null
          ? `${(stock.profitMargin * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "pe",
      label: "P/E Ratio",
      score: stock.breakdown.pe,
      max: 20,
      value:
        stock.trailingPE !== null ? `${stock.trailingPE.toFixed(1)}×` : "N/A",
    },
    {
      key: "fcf",
      label: "Free Cash Flow",
      score: stock.breakdown.fcf,
      max: 10,
      value:
        stock.freeCashFlow !== null
          ? stock.freeCashFlow > 0
            ? "Positive ✓"
            : "Negative ✗"
          : "N/A",
    },
    {
      key: "dividend",
      label: "Dividend Yield",
      score: stock.breakdown.dividend,
      max: 10,
      value:
        stock.dividendYield !== null && stock.dividendYield > 0
          ? `${(stock.dividendYield * 100).toFixed(2)}%`
          : "None",
    },
  ];

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
      {/* Change 6: Price column */}
      <td className="px-4 py-3 text-right text-sm text-text-primary">
        {stock.currentPrice !== null
          ? `₹${stock.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
          : "—"}
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
        {/* Change 5: Use CriteriaSquare with tooltips, Change 2: increased gap */}
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

// Change 7: Redesigned My Holding Card
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

  // Build criteria values for this holding
  const criteriaValues = [
    {
      key: "roe",
      label: "ROE",
      score: holding.buffettScore.breakdown.roe,
      max: 20,
      value:
        holding.buffettScore.roe !== null
          ? `${(holding.buffettScore.roe * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "debtEquity",
      label: "D/E",
      score: holding.buffettScore.breakdown.debtEquity,
      max: 20,
      value:
        holding.buffettScore.debtToEquity !== null
          ? holding.buffettScore.debtToEquity.toFixed(2)
          : "N/A",
    },
    {
      key: "margin",
      label: "Margin",
      score: holding.buffettScore.breakdown.margin,
      max: 20,
      value:
        holding.buffettScore.profitMargin !== null
          ? `${(holding.buffettScore.profitMargin * 100).toFixed(1)}%`
          : "N/A",
    },
    {
      key: "pe",
      label: "P/E",
      score: holding.buffettScore.breakdown.pe,
      max: 20,
      value:
        holding.buffettScore.trailingPE !== null
          ? `${holding.buffettScore.trailingPE.toFixed(1)}×`
          : "N/A",
    },
    {
      key: "fcf",
      label: "FCF",
      score: holding.buffettScore.breakdown.fcf,
      max: 10,
      value:
        holding.buffettScore.freeCashFlow !== null
          ? holding.buffettScore.freeCashFlow > 0
            ? "Positive ✓"
            : "Negative ✗"
          : "N/A",
    },
    {
      key: "dividend",
      label: "Div",
      score: holding.buffettScore.breakdown.dividend,
      max: 10,
      value:
        holding.buffettScore.dividendYield !== null &&
        holding.buffettScore.dividendYield > 0
          ? `${(holding.buffettScore.dividendYield * 100).toFixed(2)}%`
          : "None",
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
      {/* Row 1 - Header */}
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
