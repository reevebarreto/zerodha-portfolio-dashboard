import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility functions for formatting and calculations
 */

/**
 * Format currency in Indian number system (₹1,23,456)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format currency with decimals
 */
export function formatCurrencyWithDecimals(
  value: number,
  decimals: number = 2,
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers in Indian system (lakhs/crores)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  return formatCurrency(value);
}

/**
 * Check if market is currently open (IST 9:15 AM - 3:30 PM, Mon-Fri)
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const day = ist.getDay();
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const time = hour * 60 + min;

  // Monday to Friday (1-5), 9:15 AM to 3:30 PM (555 to 930 minutes)
  return day >= 1 && day <= 5 && time >= 555 && time <= 930;
}

/**
 * Get card size based on portfolio weight for equity grid
 */
export function getCardSize(weight: number): "xl" | "lg" | "md" | "sm" {
  if (weight >= 0.15) return "xl"; // 2x2 grid cells
  if (weight >= 0.08) return "lg"; // 2x1 grid cells
  if (weight >= 0.04) return "md"; // 1x1 grid cells
  return "sm"; // compact, 1x1
}

/**
 * Get grid span classes for card size
 */
export function getGridSpan(size: "xl" | "lg" | "md" | "sm"): string {
  switch (size) {
    case "xl":
      return "col-span-2 row-span-2";
    case "lg":
      return "col-span-2 row-span-1";
    case "md":
    case "sm":
    default:
      return "col-span-1 row-span-1";
  }
}

/**
 * Classify fund type color
 */
export function getFundTypeColor(fundType: string): string {
  switch (fundType.toUpperCase()) {
    case "EQUITY":
      return "bg-accent-green/10 text-accent-green";
    case "DEBT":
      return "bg-accent-blue/10 text-accent-blue";
    case "ELSS":
      return "bg-accent-amber/10 text-accent-amber";
    case "HYBRID":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-bg-tertiary text-text-secondary";
  }
}

/**
 * Get grade color for Buffett score
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-accent-green/10 text-accent-green";
    case "B":
      return "bg-accent-blue/10 text-accent-blue";
    case "C":
      return "bg-accent-amber/10 text-accent-amber";
    case "D":
      return "bg-accent-red/10 text-accent-red";
    default:
      return "bg-bg-tertiary text-text-secondary";
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Combine class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Made with Bob
