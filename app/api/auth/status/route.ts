import { NextResponse } from "next/server";
import { getSession } from "@/lib/db";

export async function GET() {
  try {
    const session = getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      token_created_at: session.created_at,
      user_name: session.user_name,
      email: session.email,
    });
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 },
    );
  }
}

// Made with Bob
