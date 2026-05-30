"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAuthStatus,
  useOverview,
  useHoldings,
  useMutualFunds,
} from "@/hooks/usePortfolio";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: mutualFunds, isLoading: mfLoading } = useMutualFunds();

  useEffect(() => {
    if (!authLoading && !authStatus?.authenticated) {
      router.push("/login");
    }
  }, [authStatus, authLoading, router]);

  if (authLoading || overviewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-default">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-medium text-text-primary">Portfolio</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-primary rounded-lg p-5 border border-border-default">
            <p className="text-xs text-text-secondary mb-1">
              Total portfolio value
            </p>
            <p className="text-2xl font-medium text-text-primary">
              {overview ? formatCurrency(overview.net_worth.total) : "—"}
            </p>
          </div>

          <div className="bg-bg-primary rounded-lg p-5 border border-border-default">
            <p className="text-xs text-text-secondary mb-1">Total P&L</p>
            <p className="text-2xl font-medium text-text-primary">
              {overview ? formatCurrency(overview.total_pnl) : "—"}
            </p>
            {overview && (
              <p
                className={`text-sm ${overview.total_pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}
              >
                {formatPercent(overview.total_pnl_percent)}
              </p>
            )}
          </div>

          <div className="bg-bg-primary rounded-lg p-5 border border-border-default">
            <p className="text-xs text-text-secondary mb-1">Today's change</p>
            <p className="text-2xl font-medium text-text-primary">
              {overview ? formatCurrency(overview.day_change) : "—"}
            </p>
            {overview && (
              <p
                className={`text-sm ${overview.day_change >= 0 ? "text-accent-green" : "text-accent-red"}`}
              >
                {formatPercent(overview.day_change_percent)}
              </p>
            )}
          </div>

          <div className="bg-bg-primary rounded-lg p-5 border border-border-default">
            <p className="text-xs text-text-secondary mb-1">Total invested</p>
            <p className="text-2xl font-medium text-text-primary">
              {overview ? formatCurrency(overview.total_invested) : "—"}
            </p>
          </div>
        </div>

        {/* Holdings Preview */}
        <div className="bg-bg-primary rounded-xl p-6 border border-border-default mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">
              Equity Holdings
            </h2>
            <a
              href="/dashboard/equity"
              className="text-sm text-accent-blue hover:underline"
            >
              View all →
            </a>
          </div>

          {holdingsLoading ? (
            <p className="text-text-secondary">Loading holdings...</p>
          ) : holdings && holdings.length > 0 ? (
            <div className="space-y-3">
              {holdings.slice(0, 3).map((holding) => (
                <div
                  key={holding.tradingsymbol}
                  className="flex items-center justify-between py-3 border-b border-border-default last:border-0"
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      {holding.tradingsymbol}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {holding.quantity} shares
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">
                      {formatCurrency(holding.current_value)}
                    </p>
                    <p
                      className={`text-sm ${holding.pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}
                    >
                      {formatPercent(holding.pnl_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">No holdings found</p>
          )}
        </div>

        {/* Mutual Funds Preview */}
        <div className="bg-bg-primary rounded-xl p-6 border border-border-default">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">
              Mutual Funds
            </h2>
            <a
              href="/dashboard/mutualfunds"
              className="text-sm text-accent-blue hover:underline"
            >
              View all →
            </a>
          </div>

          {mfLoading ? (
            <p className="text-text-secondary">Loading mutual funds...</p>
          ) : mutualFunds && mutualFunds.length > 0 ? (
            <div className="space-y-3">
              {mutualFunds.slice(0, 3).map((fund) => (
                <div
                  key={fund.folio}
                  className="flex items-center justify-between py-3 border-b border-border-default last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{fund.fund}</p>
                    <p className="text-sm text-text-secondary">
                      {fund.fund_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">
                      {formatCurrency(fund.current_value)}
                    </p>
                    <p
                      className={`text-sm ${fund.pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}
                    >
                      {formatPercent(fund.pnl_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">No mutual funds found</p>
          )}
        </div>

        {/* Buffett Score Card */}
        <div className="bg-bg-primary rounded-xl p-6 border border-border-default">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">
              Buffett Score
            </h2>
            <a
              href="/dashboard/buffett"
              className="text-sm text-accent-blue hover:underline"
            >
              View analysis →
            </a>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Discover which Nifty 50 stocks align with Warren Buffett's
            investment principles. Get personalized allocation recommendations
            based on fundamental analysis.
          </p>
          <a
            href="/dashboard/buffett"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
          >
            Analyze Nifty 50 Stocks
          </a>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
