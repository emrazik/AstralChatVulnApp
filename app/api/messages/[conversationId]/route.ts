import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getMessages, sendMessage, deleteMessage, buildChannelId } from "@/lib/messages";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await params;

  const isChannel = /^C[0-9A-F]{6}$/.test(conversationId);
  if (!isChannel && !conversationId.includes(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }
  if (isChannel && conversationId !== buildChannelId(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load messages.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

type PostBody = { content?: string };

export async function POST(request: Request, { params }: Params) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await params;

  const isChannelPost = /^C[0-9A-F]{6}$/.test(conversationId);
  if (!isChannelPost && !conversationId.includes(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }
  if (isChannelPost && conversationId !== buildChannelId(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as PostBody;
  if (!body.content?.trim()) {
    return NextResponse.json(
      { message: "Message content is required." },
      { status: 400 }
    );
  }

  try {
    // Channels allow only one message per user — replace any existing one
    if (/^C[0-9A-F]{6}$/.test(conversationId)) {
      const existing = await getMessages(conversationId, 100);
      const prior = existing.find((m) => m.senderId === userId);
      if (prior) {
        await deleteMessage(conversationId, prior.sentAt);
      }
    }

    const msg = await sendMessage(conversationId, userId, body.content.trim());
    return NextResponse.json({ message: msg });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
