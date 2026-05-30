import { NextRequest, NextResponse } from "next/server";
import { scoreAllNifty50, calculateAllocation } from "@/lib/buffettScorer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topN = parseInt(searchParams.get("topN") ?? "12");
    const budget = parseInt(searchParams.get("budget") ?? "100000");

    console.log(
      `[API] GET /api/buffett/scores - topN=${topN}, budget=${budget}`,
    );

    const scores = await scoreAllNifty50();

    if (!scores || scores.length === 0) {
      // Cold cache — scoring is in progress
      console.log("[API] Scores not ready yet, returning 202 status");
      return NextResponse.json(
        { status: "calculating", estimatedSeconds: 45 },
        { status: 202 },
      );
    }

    console.log(
      `[API] Returning ${scores.length} scores with allocation for top ${topN}`,
    );
    const allocation = calculateAllocation(scores, budget, topN);

    return NextResponse.json({
      scores: allocation,
      allScores: scores,
      meta: { topN, budget, generatedAt: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error("Error in /api/buffett/scores:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Made with Bob
