import { NextResponse } from "next/server";
import { scoreAllNifty50 } from "@/lib/buffettScorer";
import { getKiteClient } from "@/lib/kite-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const kite = getKiteClient();

    // Check if user is authenticated
    if (!kite) {
      return NextResponse.json({
        holdings: [],
        authenticated: false,
        message: "Login to see your holdings analysis",
      });
    }

    let holdings;
    try {
      holdings = await kite.getHoldings();
    } catch (authErr: any) {
      // Handle authentication errors gracefully
      if (
        authErr.message?.includes("api_key") ||
        authErr.message?.includes("access_token")
      ) {
        return NextResponse.json({
          holdings: [],
          authenticated: false,
          message: "Login to see your holdings analysis",
        });
      }
      throw authErr;
    }

    const scores = await scoreAllNifty50();

    const scoreMap = Object.fromEntries(scores.map((s: any) => [s.symbol, s]));

    const enriched = holdings.map((h: any) => {
      const score = scoreMap[h.tradingsymbol] ?? null;
      let verdict = "No data — not in Nifty 50";

      if (score) {
        if (score.grade === "A")
          verdict = "Strong hold — Buffett would approve";
        else if (score.grade === "B") verdict = "Hold — decent fundamentals";
        else if (score.grade === "C")
          verdict = "Review — fundamentals are weak";
        else verdict = "Consider reducing — does not meet criteria";
      }

      return {
        ...h,
        buffettScore: score,
        verdict,
        currentValue: h.last_price * h.quantity,
        investedValue: h.average_price * h.quantity,
      };
    });

    return NextResponse.json({ holdings: enriched });
  } catch (err: any) {
    console.error("Error in /api/buffett/my-holdings:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Made with Bob
