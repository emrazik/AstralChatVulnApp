import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  getMessages,
  sendMessage,
  buildChannelId,
  isConversationMember,
  CHANNEL_ID_PATTERN,
  type DirectMessage
} from "@/lib/messages";

type Params = { params: Promise<{ conversationId: string }> };

// Channels keep the full history but only surface each sender's most recent message,
// so users can retry injection payloads without old ones crowding the UI.
function latestPerSender(messages: DirectMessage[]): DirectMessage[] {
  const bySender = new Map<string, DirectMessage>();
  for (const m of messages) {
    const prev = bySender.get(m.senderId);
    if (!prev || m.sentAt > prev.sentAt) bySender.set(m.senderId, m);
  }
  return Array.from(bySender.values()).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await params;

  const isChannel = CHANNEL_ID_PATTERN.test(conversationId);
  if (!isChannel && !isConversationMember(conversationId, userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }
  if (isChannel && conversationId !== buildChannelId(userId)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const messages = await getMessages(conversationId);
    const display = isChannel ? latestPerSender(messages) : messages;
    return NextResponse.json({ messages: display });
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

  const isChannelPost = CHANNEL_ID_PATTERN.test(conversationId);
  if (!isChannelPost && !isConversationMember(conversationId, userId)) {
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
    const msg = await sendMessage(conversationId, userId, body.content.trim());
    return NextResponse.json({ message: msg });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
