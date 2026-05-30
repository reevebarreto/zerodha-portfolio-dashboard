import { NextResponse } from "next/server";
import { scoreAllNifty50, clearCache } from "@/lib/buffettScorer";

export const runtime = "nodejs";

export async function POST() {
  try {
    clearCache();
    // Kick off scoring asynchronously — don't await, respond immediately
    scoreAllNifty50().catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Refresh started. Results cached in ~45s.",
    });
  } catch (err: any) {
    console.error("Error in /api/buffett/refresh:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Made with Bob
