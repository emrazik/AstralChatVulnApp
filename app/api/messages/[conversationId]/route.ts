import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getMessages, sendMessage } from "@/lib/messages";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await params;

  if (!conversationId.includes(userId)) {
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

  if (!conversationId.includes(userId)) {
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
