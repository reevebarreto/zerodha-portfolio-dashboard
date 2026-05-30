import { NextResponse } from "next/server";
import { getHoldings, getLTP } from "@/lib/kite-client";
import { getCache, setCache, getAllCache } from "@/lib/db";

interface EnrichedHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  pnl_percent: number;
  current_value: number;
  invested_value: number;
  day_change: number;
  day_change_percent: number;
  portfolio_weight: number;
  t1_quantity: number;
}

export async function GET() {
  try {
    // Check cache first
    const cached = getAllCache("holdings_cache");
    if (cached.length > 0) {
      return NextResponse.json(cached);
    }

    // Fetch fresh data from Kite
    const holdings = await getHoldings();

    if (!holdings || holdings.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate total portfolio value for weights using data from holdings
    // Note: Not using getLTP() as it requires market data subscription
    let totalValue = 0;
    holdings.forEach((h: any) => {
      const ltp = h.last_price || h.average_price;
      totalValue += ltp * h.quantity;
    });

    // Enrich holdings data
    const enrichedHoldings: EnrichedHolding[] = holdings.map((holding: any) => {
      const ltp = holding.last_price || holding.average_price;
      const closePrice = holding.close_price || ltp;

      const quantity = holding.quantity || 0;
      const avgPrice = holding.average_price || 0;
      const currentValue = ltp * quantity;
      const investedValue = avgPrice * quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      const dayChange = ltp - closePrice;
      const dayChangePercent =
        closePrice > 0 ? (dayChange / closePrice) * 100 : 0;
      const portfolioWeight = totalValue > 0 ? currentValue / totalValue : 0;

      return {
        tradingsymbol: holding.tradingsymbol,
        exchange: holding.exchange,
        isin: holding.isin || "",
        quantity,
        average_price: avgPrice,
        last_price: ltp,
        close_price: closePrice,
        pnl,
        pnl_percent: pnlPercent,
        current_value: currentValue,
        invested_value: investedValue,
        day_change: dayChange,
        day_change_percent: dayChangePercent,
        portfolio_weight: portfolioWeight,
        t1_quantity: holding.t1_quantity || 0,
      };
    });

    // Cache each holding
    enrichedHoldings.forEach((holding) => {
      setCache("holdings_cache", holding.tradingsymbol, holding);
    });

    return NextResponse.json(enrichedHoldings);
  } catch (error: any) {
    console.error("Error fetching holdings:", error);

    // Handle session expiry
    if (error.message === "SESSION_EXPIRED") {
      return NextResponse.json(
        {
          error: true,
          message: "Session expired. Please login again.",
          sessionExpired: true,
        },
        { status: 401 },
      );
    }

    // Handle token errors from Kite API
    if (
      error.message?.includes("api_key") ||
      error.message?.includes("access_token") ||
      error.message?.includes("TokenException")
    ) {
      // Clear the invalid session
      const { deleteSession } = require("@/lib/db");
      deleteSession();
      return NextResponse.json(
        {
          error: true,
          message: "Authentication failed. Please login again.",
          sessionExpired: true,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: true, message: error.message },
      { status: error.message.includes("Not authenticated") ? 401 : 500 },
    );
  }
}

// Made with Bob
