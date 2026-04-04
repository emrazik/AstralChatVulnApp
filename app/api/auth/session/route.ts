import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const profile = await getProfile(userId);

  return NextResponse.json({
    authenticated: true,
    userId,
    displayName: profile?.displayName ?? null,
    zodiacSign: profile?.zodiacSign ?? null
  });
}
