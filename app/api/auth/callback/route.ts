import { NextRequest, NextResponse } from "next/server";
import { generateSession, getProfile } from "@/lib/kite-client";
import { saveSession } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestToken = searchParams.get("request_token");
    const status = searchParams.get("status");

    if (status !== "success" || !requestToken) {
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", request.url),
      );
    }

    // Generate session with Kite
    const sessionData = await generateSession(requestToken);

    // Get user profile
    let profile;
    try {
      profile = await getProfile();
    } catch (error) {
      console.warn("Could not fetch profile, continuing without it");
    }

    // Save session to database
    saveSession(sessionData.access_token, profile);

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error: any) {
    console.error("Error in auth callback:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }
}

// Made with Bob
