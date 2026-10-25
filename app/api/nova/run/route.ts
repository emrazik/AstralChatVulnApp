import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { buildChannelId, CHANNEL_ID_PATTERN } from "@/lib/messages";
import { getProfile } from "@/lib/profile";
import { runNovaAgent } from "@/lib/nova-agent";

type PostBody = { channelId?: string };

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PostBody;
  const channelId = body.channelId?.toUpperCase();
  if (!channelId || !CHANNEL_ID_PATTERN.test(channelId)) {
    return NextResponse.json({ message: "Invalid channelId." }, { status: 400 });
  }

  if (channelId !== buildChannelId(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const profile = await getProfile(userId);
  if (!profile?.hexId) {
    return NextResponse.json({ newlyRevealed: [] });
  }

  try {
    const newlyRevealed = await runNovaAgent({
      userId,
      userHexId: profile.hexId,
      channelId
    });
    return NextResponse.json({ newlyRevealed });
  } catch (err) {
    console.error("[nova-agent] run failed:", err);
    return NextResponse.json({ newlyRevealed: [] });
  }
}
