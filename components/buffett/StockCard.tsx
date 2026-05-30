"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CriteriaScore {
  label: string;
  shortLabel: string;
  value: string;
  score: number;
  maxScore: number;
}

interface StockCardProps {
  rank: number;
  symbol: string;
  price: number;
  score: number;
  grade: string;
  yearTrend: number;
  allocation: {
    weight: number;
    amount: number;
  };
  criteria: CriteriaScore[];
  isOwned?: boolean;
  ownedData?: {
    investedValue: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
  };
}

const gradeColors = {
  A: "bg-green-500/10 text-green-500 border-green-500/20",
  B: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  C: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  D: "bg-red-500/10 text-red-500 border-red-500/20",
};

function getCriteriaColor(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (score < 0) return "bg-red-500/80";
  if (percentage >= 80) return "bg-green-500/80";
  if (percentage >= 50) return "bg-amber-500/80";
  return "bg-red-500/60";
}

function MiniSparkline({ trend }: { trend: number }) {
  // Simple SVG sparkline - in production, use real historical data
  const isPositive = trend >= 0;
  const points = isPositive
    ? "0,20 10,18 20,15 30,12 40,10 50,8 60,5"
    : "0,5 10,8 20,10 30,12 40,15 50,18 60,20";

  return (
    <svg width="60" height="20" className="opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#16a34a" : "#dc2626"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StockCard({
  rank,
  symbol,
  price,
  score,
  grade,
  yearTrend,
  allocation,
  criteria,
  isOwned = false,
  ownedData,
}: StockCardProps) {
  const scoreColor =
    score >= 65
      ? "text-green-500"
      : score < 0
        ? "text-red-500"
        : "text-foreground";

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                #{rank}
              </span>
              <h3 className="text-lg font-medium">{symbol}</h3>
              {isOwned && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20"
                >
                  Owned
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(price)}
            </p>
          </div>
          <div className="text-right">
            <Badge
              className={cn(
                "mb-1",
                gradeColors[grade as keyof typeof gradeColors],
              )}
            >
              {grade}
            </Badge>
            <p className={cn("text-2xl font-medium font-mono", scoreColor)}>
              {score}
            </p>
          </div>
        </div>

        {/* Sparkline & Trend */}
        <div className="flex items-center justify-between py-2 border-y border-border">
          <MiniSparkline trend={yearTrend} />
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">1Y trend</span>
            <span
              className={cn(
                "text-sm font-medium flex items-center gap-1",
                yearTrend >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {yearTrend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPercent(yearTrend, 1)}
            </span>
          </div>
        </div>

        {/* Criteria Pills */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Buffett Criteria</p>
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap gap-1.5">
              {criteria.map((criterion, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium text-white cursor-help transition-all hover:scale-105",
                        getCriteriaColor(criterion.score, criterion.maxScore),
                      )}
                    >
                      {criterion.shortLabel}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-48">
                    <div className="text-center">
                      <p className="font-medium">{criterion.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Value: {criterion.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Score: {criterion.score}/{criterion.maxScore}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* Holdings Info (if owned) */}
        {isOwned && ownedData && (
          <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invested</span>
              <span>{formatCurrency(ownedData.investedValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span>{formatCurrency(ownedData.currentValue)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">P&L</span>
              <span
                className={
                  ownedData.pnl >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {formatCurrency(ownedData.pnl)} (
                {formatPercent(ownedData.pnlPercent)})
              </span>
            </div>
          </div>
        )}

        {/* Allocation Footer */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Target allocation</span>
            <span className="font-medium">
              {formatCurrency(allocation.amount)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Weight</span>
            <span>{(allocation.weight * 100).toFixed(1)}%</span>
          </div>
          <Progress value={allocation.weight * 100} className="h-1" />
        </div>
      </div>
    </Card>
  );
}

// Made with Bob
