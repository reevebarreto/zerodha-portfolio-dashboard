/**
 * API client for backend communication
 */
import type {
  AuthStatus,
  LoginURL,
  Holding,
  HoldingsSummary,
  HoldingDetail,
  MutualFund,
  MFSummary,
  SIP,
  PortfolioOverview,
  Snapshot,
  BuffettResponse,
  BuffettHoldings,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "API error" }));
    throw new Error(error.message || `API error ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    status: () => apiFetch<AuthStatus>("/auth/status"),
    login: () => apiFetch<LoginURL>("/auth/login"),
    logout: () =>
      fetch(`${BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }),
  },

  holdings: {
    all: () => apiFetch<Holding[]>("/holdings"),
    summary: () => apiFetch<HoldingsSummary>("/holdings/summary"),
    detail: (symbol: string) => apiFetch<HoldingDetail>(`/holdings/${symbol}`),
  },

  mutualfunds: {
    all: () => apiFetch<MutualFund[]>("/mutualfunds"),
    summary: () => apiFetch<MFSummary>("/mutualfunds/summary"),
    sips: () => apiFetch<SIP[]>("/mutualfunds/sips"),
  },

  portfolio: {
    overview: () => apiFetch<PortfolioOverview>("/portfolio/overview"),
    history: (days: number) =>
      apiFetch<Snapshot[]>(`/portfolio/history?days=${days}`),
    snapshot: () =>
      fetch(`${BASE}/portfolio/snapshot`, {
        method: "POST",
        credentials: "include",
      }).then((res) => res.json()),
  },

  buffett: {
    nifty50: () => apiFetch<BuffettResponse>("/buffett/nifty50"),
    myHoldings: () => apiFetch<BuffettHoldings>("/buffett/my-holdings"),
    scores: (budget: number, topN: number) =>
      apiFetch<any>(`/buffett/scores?budget=${budget}&topN=${topN}`),
  },
};

// Made with Bob
