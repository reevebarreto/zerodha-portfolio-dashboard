import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export async function POST() {
  try {
    deleteSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error logging out:", error);
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 },
    );
  }
}

// Made with Bob
