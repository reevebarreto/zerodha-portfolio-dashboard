"use client";

import { useRouter } from "next/navigation";
import { useHoldings, useHoldingsSummary } from "@/hooks/usePortfolio";
import {
  formatCurrency,
  formatPercent,
  getCardSize,
  getGridSpan,
} from "@/lib/utils";

export default function EquityPage() {
  const router = useRouter();
  const { data: holdings, isLoading } = useHoldings();
  const { data: summary } = useHoldingsSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading holdings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-accent-blue hover:underline mb-2 text-sm"
          >
            ← Back to dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-text-primary">
                Equity Holdings
              </h1>
              {summary && (
                <p className="text-sm text-text-secondary mt-1">
                  {summary.number_of_holdings} stocks •{" "}
                  {formatCurrency(summary.total_current_value)}
                </p>
              )}
            </div>
            {summary && (
              <div className="text-right">
                <p className="text-sm text-text-secondary">Total P&L</p>
                <p
                  className={`text-xl font-medium ${summary.total_pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}
                >
                  {formatCurrency(summary.total_pnl)} (
                  {formatPercent(summary.total_pnl_percent)})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holdings Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-6 gap-4 auto-rows-[120px]">
          {holdings?.map((holding) => {
            const size = getCardSize(holding.portfolio_weight);
            const gridSpan = getGridSpan(size);
            const isPositive = holding.pnl >= 0;

            return (
              <div
                key={holding.tradingsymbol}
                className={`${gridSpan} bg-bg-primary rounded-lg p-4 border border-border-default ${
                  isPositive
                    ? "border-l-2 border-l-accent-green"
                    : "border-l-2 border-l-accent-red"
                } hover:shadow-sm transition-all`}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <p className="font-medium text-text-primary text-lg">
                      {holding.tradingsymbol}
                    </p>
                    {size !== "sm" && (
                      <p className="text-xs text-text-secondary">
                        {holding.exchange}
                      </p>
                    )}
                  </div>

                  <div>
                    {(size === "xl" || size === "lg") && (
                      <p className="text-sm text-text-secondary mb-1">
                        {holding.quantity} shares @{" "}
                        {formatCurrency(holding.last_price)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-text-primary">
                        {formatCurrency(holding.current_value)}
                      </p>
                      <p
                        className={`text-sm font-medium ${isPositive ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatPercent(holding.pnl_percent)}
                      </p>
                    </div>
                    {size === "xl" && (
                      <p
                        className={`text-xs ${holding.day_change >= 0 ? "text-accent-green" : "text-accent-red"}`}
                      >
                        Today: {formatPercent(holding.day_change_percent)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!holdings || holdings.length === 0) && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No holdings found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
