// Indian number formatting utilities

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRShort(amount: number): string {
  // Round to 2 decimal places first to avoid floating point errors
  const rounded = Math.round(amount * 100) / 100;

  if (rounded >= 10000000) return `₹${(rounded / 10000000).toFixed(1)}Cr`;
  if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(1)}L`;
  if (rounded >= 1000) return `₹${(rounded / 1000).toFixed(0)}K`;
  return `₹${rounded.toFixed(2)}`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

// Made with Bob
