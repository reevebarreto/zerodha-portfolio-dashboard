import { NextResponse } from "next/server";
import { getMFHoldings, getMFSIPs } from "@/lib/kite-client";
import { getAllCache, setCache } from "@/lib/db";

function classifyFundType(fundName: string): string {
  const name = fundName.toLowerCase();
  if (name.includes("elss")) return "ELSS";
  if (name.includes("debt") || name.includes("liquid") || name.includes("gilt"))
    return "Debt";
  if (name.includes("hybrid") || name.includes("balanced")) return "Hybrid";
  return "Equity";
}

export async function GET() {
  try {
    // Check cache first
    const cached = getAllCache("mf_cache");
    if (cached.length > 0) {
      return NextResponse.json(cached);
    }

    // Fetch fresh data
    const holdings = await getMFHoldings();

    if (!holdings || holdings.length === 0) {
      return NextResponse.json([]);
    }

    // Get SIPs to check which funds have active SIPs
    let sips: any[] = [];
    try {
      sips = await getMFSIPs();
    } catch (error) {
      console.warn("Could not fetch SIPs:", error);
    }

    // Create a map of active SIPs by folio
    const activeSipsByFolio = new Map();
    sips.forEach((sip: any) => {
      if (sip.status === "ACTIVE") {
        activeSipsByFolio.set(sip.folio, true);
      }
    });

    // Enrich mutual fund data
    const enrichedFunds = holdings.map((fund: any) => {
      const quantity = fund.quantity || 0;
      const avgPrice = fund.average_price || 0;
      const lastPrice = fund.last_price || avgPrice;
      const currentValue = lastPrice * quantity;
      const investedValue = avgPrice * quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      const fundType = classifyFundType(fund.fund || "");
      const sipActive = activeSipsByFolio.has(fund.folio);

      return {
        folio: fund.folio,
        fund: fund.fund,
        tradingsymbol: fund.tradingsymbol,
        quantity,
        average_price: avgPrice,
        last_price: lastPrice,
        last_price_date: fund.last_price_date,
        pnl,
        pnl_percent: pnlPercent,
        current_value: currentValue,
        invested_value: investedValue,
        portfolio_weight: 0, // Will be calculated after we have total
        fund_type: fundType,
        sip_active: sipActive,
      };
    });

    // Calculate portfolio weights
    const totalValue = enrichedFunds.reduce(
      (sum, f) => sum + f.current_value,
      0,
    );
    enrichedFunds.forEach((fund) => {
      fund.portfolio_weight =
        totalValue > 0 ? fund.current_value / totalValue : 0;
    });

    // Cache each fund
    enrichedFunds.forEach((fund) => {
      setCache("mf_cache", fund.folio, fund);
    });

    return NextResponse.json(enrichedFunds);
  } catch (error: any) {
    console.error("Error fetching mutual funds:", error);

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
