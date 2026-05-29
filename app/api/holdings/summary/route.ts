import { NextResponse } from "next/server";
import { getHoldings, getLTP } from "@/lib/kite-client";

export async function GET() {
  try {
    const holdings = await getHoldings();

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        total_invested: 0,
        total_current_value: 0,
        total_pnl: 0,
        total_pnl_percent: 0,
        total_day_change: 0,
        total_day_change_percent: 0,
        number_of_holdings: 0,
        top_gainer: null,
        top_loser: null,
      });
    }

    // Calculate summary using data from holdings
    // Note: Not using getLTP() as it requires market data subscription
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDayChange = 0;
    let topGainer: any = null;
    let topLoser: any = null;

    holdings.forEach((holding: any) => {
      const ltp = holding.last_price || holding.average_price;
      const closePrice = holding.close_price || ltp;

      const quantity = holding.quantity || 0;
      const avgPrice = holding.average_price || 0;
      const currentValue = ltp * quantity;
      const investedValue = avgPrice * quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      const dayChange = (ltp - closePrice) * quantity;

      totalInvested += investedValue;
      totalCurrentValue += currentValue;
      totalDayChange += dayChange;

      // Track top gainer and loser
      if (!topGainer || pnlPercent > topGainer.pnl_percent) {
        topGainer = { symbol: holding.tradingsymbol, pnl_percent: pnlPercent };
      }
      if (!topLoser || pnlPercent < topLoser.pnl_percent) {
        topLoser = { symbol: holding.tradingsymbol, pnl_percent: pnlPercent };
      }
    });

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const totalDayChangePercent =
      totalCurrentValue - totalDayChange > 0
        ? (totalDayChange / (totalCurrentValue - totalDayChange)) * 100
        : 0;

    return NextResponse.json({
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      total_day_change: totalDayChange,
      total_day_change_percent: totalDayChangePercent,
      number_of_holdings: holdings.length,
      top_gainer: topGainer,
      top_loser: topLoser,
    });
  } catch (error: any) {
    console.error("Error fetching holdings summary:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: error.message.includes("Not authenticated") ? 401 : 500 },
    );
  }
}

// Made with Bob
