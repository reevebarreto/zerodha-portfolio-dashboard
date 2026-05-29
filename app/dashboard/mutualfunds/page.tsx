"use client";

import { useRouter } from "next/navigation";
import { useMutualFunds, useMFSummary } from "@/hooks/usePortfolio";
import { formatCurrency, formatPercent, getFundTypeColor } from "@/lib/utils";

export default function MutualFundsPage() {
  const router = useRouter();
  const { data: funds, isLoading } = useMutualFunds();
  const { data: summary } = useMFSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading mutual funds...</p>
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
                Mutual Funds
              </h1>
              {summary && (
                <p className="text-sm text-text-secondary mt-1">
                  {summary.number_of_funds} funds •{" "}
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

      {/* Funds Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds?.map((fund) => {
            const isPositive = fund.pnl >= 0;

            return (
              <div
                key={fund.folio}
                className="bg-bg-primary rounded-lg p-5 border border-border-default hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary line-clamp-2 mb-1">
                      {fund.fund}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getFundTypeColor(fund.fund_type)}`}
                    >
                      {fund.fund_type}
                    </span>
                  </div>
                  {fund.sip_active && (
                    <span className="ml-2 px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs font-medium">
                      SIP
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Units</span>
                    <span className="text-text-primary font-medium">
                      {fund.quantity.toFixed(3)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Avg NAV</span>
                    <span className="text-text-primary">
                      {formatCurrency(fund.average_price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Current NAV</span>
                    <span className="text-text-primary">
                      {formatCurrency(fund.last_price)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border-default">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        Current value
                      </span>
                      <span className="text-lg font-medium text-text-primary">
                        {formatCurrency(fund.current_value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-text-secondary">P&L</span>
                      <span
                        className={`text-sm font-medium ${isPositive ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatCurrency(fund.pnl)} (
                        {formatPercent(fund.pnl_percent)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!funds || funds.length === 0) && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No mutual funds found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
