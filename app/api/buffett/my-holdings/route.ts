import { NextResponse } from "next/server";
import { scoreAllNifty50 } from "@/lib/buffettScorer";
import { getKiteClient } from "@/lib/kite-client";
import NodeCache from "node-cache";

export const runtime = "nodejs";

// Cache holdings for 5 minutes to avoid repeated Kite API calls
const holdingsCache = new NodeCache({ stdTTL: 300 });
const CACHE_KEY = "my_holdings_enriched";

export async function GET() {
  try {
    // Check cache first
    const cached = holdingsCache.get(CACHE_KEY);
    if (cached) {
      console.log("[API] Returning cached my-holdings data");
      return NextResponse.json(cached);
    }

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

    const response = { holdings: enriched, authenticated: true };

    // Cache the enriched holdings
    holdingsCache.set(CACHE_KEY, response);
    console.log("[API] Cached my-holdings data for 5 minutes");

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error in /api/buffett/my-holdings:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Made with Bob
