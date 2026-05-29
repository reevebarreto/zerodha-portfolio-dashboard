import { NextResponse } from "next/server";
import { getMFHoldings, getMFSIPs } from "@/lib/kite-client";

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
    const holdings = await getMFHoldings();

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        total_invested: 0,
        total_current_value: 0,
        total_pnl: 0,
        total_pnl_percent: 0,
        number_of_funds: 0,
        breakdown_by_type: {},
        active_sips: 0,
        monthly_sip_amount: 0,
      });
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const breakdownByType: any = {};

    holdings.forEach((fund: any) => {
      const quantity = fund.quantity || 0;
      const avgPrice = fund.average_price || 0;
      const lastPrice = fund.last_price || avgPrice;
      const currentValue = lastPrice * quantity;
      const investedValue = avgPrice * quantity;
      const fundType = classifyFundType(fund.fund || "");

      totalInvested += investedValue;
      totalCurrentValue += currentValue;

      if (!breakdownByType[fundType]) {
        breakdownByType[fundType] = { value: 0, weight: 0 };
      }
      breakdownByType[fundType].value += currentValue;
    });

    // Calculate weights
    Object.keys(breakdownByType).forEach((type) => {
      breakdownByType[type].weight =
        totalCurrentValue > 0
          ? breakdownByType[type].value / totalCurrentValue
          : 0;
    });

    // Get SIP information
    let activeSips = 0;
    let monthlySipAmount = 0;

    try {
      const sips = await getMFSIPs();
      sips.forEach((sip: any) => {
        if (sip.status === "ACTIVE") {
          activeSips++;
          if (sip.frequency === "monthly") {
            monthlySipAmount += sip.instalment_amount || 0;
          }
        }
      });
    } catch (error) {
      console.warn("Could not fetch SIPs:", error);
    }

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return NextResponse.json({
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      number_of_funds: holdings.length,
      breakdown_by_type: breakdownByType,
      active_sips: activeSips,
      monthly_sip_amount: monthlySipAmount,
    });
  } catch (error: any) {
    console.error("Error fetching mutual funds summary:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: error.message.includes("Not authenticated") ? 401 : 500 },
    );
  }
}

// Made with Bob
