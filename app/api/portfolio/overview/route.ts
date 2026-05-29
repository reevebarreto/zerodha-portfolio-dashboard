import { NextResponse } from "next/server";
import { getHoldings, getMFHoldings, getLTP } from "@/lib/kite-client";

export async function GET() {
  try {
    // Fetch both holdings and mutual funds in parallel
    const [holdings, mfHoldings] = await Promise.all([
      getHoldings().catch(() => []),
      getMFHoldings().catch(() => []),
    ]);

    // Calculate equity totals
    let equityInvested = 0;
    let equityCurrentValue = 0;
    let equityDayChange = 0;

    if (holdings && holdings.length > 0) {
      // Use data from holdings response instead of getLTP()
      // Note: getLTP() requires market data subscription
      holdings.forEach((holding: any) => {
        const ltp = holding.last_price || holding.average_price;
        const closePrice = holding.close_price || ltp;

        const quantity = holding.quantity || 0;
        const avgPrice = holding.average_price || 0;
        const currentValue = ltp * quantity;
        const investedValue = avgPrice * quantity;
        const dayChange = (ltp - closePrice) * quantity;

        equityInvested += investedValue;
        equityCurrentValue += currentValue;
        equityDayChange += dayChange;
      });
    }

    // Calculate mutual funds totals
    let mfInvested = 0;
    let mfCurrentValue = 0;

    if (mfHoldings && mfHoldings.length > 0) {
      mfHoldings.forEach((fund: any) => {
        const quantity = fund.quantity || 0;
        const avgPrice = fund.average_price || 0;
        const lastPrice = fund.last_price || avgPrice;

        mfInvested += avgPrice * quantity;
        mfCurrentValue += lastPrice * quantity;
      });
    }

    // Calculate totals
    const totalInvested = equityInvested + mfInvested;
    const totalCurrentValue = equityCurrentValue + mfCurrentValue;
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dayChangePercent =
      equityCurrentValue - equityDayChange > 0
        ? (equityDayChange / (equityCurrentValue - equityDayChange)) * 100
        : 0;

    return NextResponse.json({
      net_worth: {
        total: totalCurrentValue,
        equity: equityCurrentValue,
        mutual_funds: mfCurrentValue,
      },
      total_invested: totalInvested,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      day_change: equityDayChange,
      day_change_percent: dayChangePercent,
      last_updated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching portfolio overview:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: error.message.includes("Not authenticated") ? 401 : 500 },
    );
  }
}

// Made with Bob
