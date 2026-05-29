import { NextResponse } from "next/server";
import { getLoginUrl } from "@/lib/kite-client";

export async function GET() {
  try {
    const loginUrl = getLoginUrl();
    return NextResponse.json({ login_url: loginUrl });
  } catch (error: any) {
    console.error("Error generating login URL:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 },
    );
  }
}

// Made with Bob
