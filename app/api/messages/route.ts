import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getConversationsForUser } from "@/lib/messages";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const conversations = await getConversationsForUser(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load conversations.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
