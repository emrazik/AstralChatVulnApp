import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  return NextResponse.json({
    wins: profile?.battleWins ?? 0,
    losses: profile?.battleLosses ?? 0
  });
}
