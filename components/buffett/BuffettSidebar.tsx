"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, Target, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BuffettSidebarProps {
  budget: number;
  onBudgetChange: (value: number) => void;
  stockCount: number;
  onStockCountChange: (value: number) => void;
  averageScore?: number;
  totalInvested?: number;
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
}

const grades = [
  { label: "All", value: "all" },
  {
    label: "Grade A",
    value: "A",
    color: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  },
  {
    label: "Grade B",
    value: "B",
    color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  },
  {
    label: "Grade C",
    value: "C",
    color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  },
  {
    label: "Grade D",
    value: "D",
    color: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  },
];

export function BuffettSidebar({
  budget,
  onBudgetChange,
  stockCount,
  onStockCountChange,
  averageScore = 0,
  totalInvested = 0,
  selectedGrade,
  onGradeChange,
}: BuffettSidebarProps) {
  const [budgetInput, setBudgetInput] = useState(budget.toString());

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setBudgetInput(value);
    const numValue = parseInt(value) || 0;
    if (numValue >= 10000 && numValue <= 10000000) {
      onBudgetChange(numValue);
    }
  };

  const toDeploy = budget - totalInvested;

  return (
    <div className="w-80 border-r border-border bg-card h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Buffett Score</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Value investing principles applied to Nifty 50
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Investment Budget */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Investment Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₹
            </span>
            <input
              type="text"
              value={budgetInput}
              onChange={handleBudgetInputChange}
              className="w-full pl-7 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="100000"
            />
          </div>
          <p className="text-xs text-muted-foreground">₹1.0L - ₹1.0Cr</p>
        </div>

        {/* Number of Stocks */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Number of Stocks
            </span>
            <span className="text-primary font-mono">{stockCount}</span>
          </label>
          <Slider
            value={[stockCount]}
            onValueChange={(value) => onStockCountChange(value[0])}
            min={5}
            max={20}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">5 - 20 stocks</p>
        </div>

        {/* Stats */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Score
            </span>
            <span className="text-sm font-medium font-mono">
              {averageScore.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              To Deploy
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(toDeploy)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Invested
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(totalInvested)}
            </span>
          </div>
        </div>

        {/* Grade Filters */}
        <div className="space-y-3 pt-3 border-t border-border">
          <label className="text-sm font-medium">Filter by Grade</label>
          <div className="flex flex-col gap-2">
            {grades.map((grade) => (
              <button
                key={grade.value}
                onClick={() => onGradeChange(grade.value)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                  selectedGrade === grade.value
                    ? grade.color || "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-secondary-foreground hover:bg-secondary",
                )}
              >
                {grade.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
