/**
 * SWR hooks for data fetching with auto-refresh
 */
import useSWR from "swr";
import { api } from "@/lib/api";
import { isMarketOpen } from "@/lib/utils";

// Refresh interval: 60 seconds during market hours, 5 minutes otherwise
const getRefreshInterval = () => {
  return isMarketOpen() ? 60000 : 300000;
};

export function useAuthStatus() {
  return useSWR("auth/status", () => api.auth.status(), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useOverview() {
  return useSWR("portfolio/overview", () => api.portfolio.overview(), {
    refreshInterval: getRefreshInterval(),
    revalidateOnFocus: true,
  });
}

export function useHoldings() {
  return useSWR("holdings", () => api.holdings.all(), {
    refreshInterval: getRefreshInterval(),
  });
}

export function useHoldingsSummary() {
  return useSWR("holdings/summary", () => api.holdings.summary(), {
    refreshInterval: getRefreshInterval(),
  });
}

export function useHoldingDetail(symbol: string | null) {
  return useSWR(
    symbol ? `holdings/${symbol}` : null,
    () => (symbol ? api.holdings.detail(symbol) : null),
    {
      refreshInterval: getRefreshInterval(),
    },
  );
}

export function useMutualFunds() {
  return useSWR("mutualfunds", () => api.mutualfunds.all(), {
    refreshInterval: 300000, // 5 minutes (MF NAV updates once daily)
  });
}

export function useMFSummary() {
  return useSWR("mutualfunds/summary", () => api.mutualfunds.summary(), {
    refreshInterval: 300000,
  });
}

export function useSIPs() {
  return useSWR("mutualfunds/sips", () => api.mutualfunds.sips(), {
    refreshInterval: 300000,
  });
}

export function usePortfolioHistory(days: number = 30) {
  return useSWR(
    `portfolio/history/${days}`,
    () => api.portfolio.history(days),
    {
      refreshInterval: 3600000, // 1 hour
    },
  );
}

export function useBuffettNifty50() {
  return useSWR("buffett/nifty50", () => api.buffett.nifty50(), {
    refreshInterval: 86400000, // 24 hours
    revalidateOnFocus: false,
  });
}

export function useBuffettMyHoldings() {
  return useSWR("buffett/my-holdings", () => api.buffett.myHoldings(), {
    refreshInterval: 86400000, // 24 hours
  });
}

// Made with Bob
