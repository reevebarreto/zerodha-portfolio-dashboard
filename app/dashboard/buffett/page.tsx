"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { BuffettSidebar } from "@/components/buffett/BuffettSidebar";
import { StockCard } from "@/components/buffett/StockCard";
import { BuffettLoadingFeed } from "@/components/BuffettLoadingFeed";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  roe: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
  trailingPE: number | null;
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
  priceChange1D: number | null;
  priceChange1M: number | null;
  priceChange1Y: number | null;
  priceChange5Y: number | null;
  weight: number;
  targetAmount: number;
  weightPercent: number;
}

export default function BuffettPage() {
  const [budget, setBudget] = useState(100000);
  const [stockCount, setStockCount] = useState(12);
  const [selectedGrade, setSelectedGrade] = useState("all");
  const router = useRouter();

  // Fetch Buffett scores
  const { data, isLoading, mutate } = useSWR(
    `buffett/scores/${budget}/${stockCount}`,
    () => api.buffett.scores(budget, stockCount),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      refreshInterval: (data) => (data?.status === "calculating" ? 5000 : 0),
      onError: (error) => {
        if (
          error?.message?.includes("Session expired") ||
          error?.message?.includes("Authentication failed")
        ) {
          router.push("/login");
        }
      },
    },
  );

  // Fetch user's holdings
  const { data: myHoldings } = useSWR(
    "buffett/my-holdings",
    () => api.buffett.myHoldings(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
      onError: (error) => {
        if (
          error?.message?.includes("Session expired") ||
          error?.message?.includes("Authentication failed")
        ) {
          router.push("/login");
        }
      },
    },
  );

  const allocation = data?.scores || [];

  // Create holdings map
  const holdingsMap = useMemo(() => {
    if (!myHoldings?.holdings) return {};
    return Object.fromEntries(
      myHoldings.holdings.map((h: any) => [h.tradingsymbol, h]),
    );
  }, [myHoldings]);

  // Filter stocks by grade
  const filteredStocks = useMemo(() => {
    if (selectedGrade === "all") return allocation;
    return allocation.filter(
      (stock: ScoredStock) => stock.grade === selectedGrade,
    );
  }, [allocation, selectedGrade]);

  // Calculate metrics
  const averageScore = useMemo(() => {
    if (!allocation.length) return 0;
    return (
      allocation.reduce((sum: number, s: ScoredStock) => sum + s.score, 0) /
      allocation.length
    );
  }, [allocation]);

  const totalInvested = useMemo(() => {
    return allocation.reduce((sum: number, stock: ScoredStock) => {
      const holding = holdingsMap[stock.symbol];
      return sum + (holding?.currentValue || 0);
    }, 0);
  }, [allocation, holdingsMap]);

  // Map criteria to display format
  const getCriteriaForStock = (stock: ScoredStock) => {
    const formatValue = (val: number | null, suffix = "") => {
      if (val === null) return "N/A";
      return `${val.toFixed(2)}${suffix}`;
    };

    return [
      {
        label: "Debt/Equity",
        shortLabel: "D/E",
        value: formatValue(stock.debtToEquity),
        score: stock.breakdown.debtEquity,
        maxScore: 15,
      },
      {
        label: "Current Ratio",
        shortLabel: "CR",
        value: formatValue(stock.currentRatio),
        score: stock.breakdown.currentRatio,
        maxScore: 10,
      },
      {
        label: "Price/Book",
        shortLabel: "P/B",
        value: formatValue(stock.priceToBook, "×"),
        score: stock.breakdown.priceToBook,
        maxScore: 10,
      },
      {
        label: "ROE",
        shortLabel: "ROE",
        value: formatValue(stock.roe, "%"),
        score: stock.breakdown.roe,
        maxScore: 10,
      },
      {
        label: "ROE Trend",
        shortLabel: "ROE↗",
        value: stock.historicalROE?.length ? "Consistent" : "N/A",
        score: stock.breakdown.roeHistorical,
        maxScore: 5,
      },
      {
        label: "ROA",
        shortLabel: "ROA",
        value: formatValue(stock.roa, "%"),
        score: stock.breakdown.roa,
        maxScore: 10,
      },
      {
        label: "EPS Growth",
        shortLabel: "EPS",
        value: stock.epsGrowthTrend || "N/A",
        score: stock.breakdown.epsGrowth,
        maxScore: 10,
      },
      {
        label: "P/E Ratio",
        shortLabel: "P/E",
        value: formatValue(stock.trailingPE, "×"),
        score: stock.breakdown.pe,
        maxScore: 10,
      },
      {
        label: "FCF/Revenue",
        shortLabel: "FCF",
        value: formatValue(stock.fcfToRevenue, "%"),
        score: stock.breakdown.fcfRevenue,
        maxScore: 10,
      },
      {
        label: "Interest Coverage",
        shortLabel: "IC",
        value:
          stock.interestCoverage === null
            ? "N/A"
            : stock.interestCoverage === 999
              ? "No debt"
              : formatValue(stock.interestCoverage, "×"),
        score: stock.breakdown.interestCoverage,
        maxScore: 5,
      },
      {
        label: "Net Margin",
        shortLabel: "NPM",
        value: formatValue(stock.profitMargin, "%"),
        score: stock.breakdown.margin,
        maxScore: 5,
      },
    ];
  };

  // Loading state
  if (isLoading || data?.status === "calculating") {
    return <BuffettLoadingFeed onComplete={() => mutate()} />;
  }

  // Error state
  if (!data || data.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Could not fetch fundamentals from Yahoo Finance.
          </p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed Sidebar */}
      <BuffettSidebar
        budget={budget}
        onBudgetChange={setBudget}
        stockCount={stockCount}
        onStockCountChange={setStockCount}
        averageScore={averageScore}
        totalInvested={totalInvested}
        selectedGrade={selectedGrade}
        onGradeChange={setSelectedGrade}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-medium mb-2">
                Top {stockCount} Stocks
              </h1>
              <p className="text-sm text-muted-foreground">
                Showing {filteredStocks.length} of {allocation.length} selected
                stocks
              </p>
            </div>

            {/* Stock Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredStocks.map((stock: ScoredStock, idx: number) => {
                const holding = holdingsMap[stock.symbol];
                const isOwned = !!holding;

                return (
                  <StockCard
                    key={stock.symbol}
                    rank={idx + 1}
                    symbol={stock.symbol}
                    price={stock.currentPrice || 0}
                    score={stock.score}
                    grade={stock.grade}
                    yearTrend={stock.priceChange1Y || 0}
                    allocation={{
                      weight: stock.weight,
                      amount: stock.targetAmount,
                    }}
                    criteria={getCriteriaForStock(stock)}
                    isOwned={isOwned}
                    ownedData={
                      isOwned
                        ? {
                            investedValue:
                              holding.average_price * holding.quantity,
                            currentValue: holding.last_price * holding.quantity,
                            pnl: holding.pnl,
                            pnlPercent: holding.pnl_percent,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>

            {/* Empty State */}
            {filteredStocks.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  No stocks match the selected grade filter.
                </p>
                <button
                  onClick={() => setSelectedGrade("all")}
                  className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Show All Stocks
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Made with Bob
