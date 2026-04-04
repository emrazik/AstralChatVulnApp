import { NextResponse } from "next/server";
import { chatWithKnowledgeBaseStream } from "@/lib/bedrock";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";

type ChatBody = {
  message?: string;
  sessionId?: string;
  pdfContext?: string;
};

type StreamEvent = {
  output?: { text?: string };
  citation?: { generatedResponsePart?: { textResponsePart?: { text?: string } } };
  guardrail?: unknown;
};

function sse(data: unknown, event = "message") {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(userId)) {
    return NextResponse.json(
      { message: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as ChatBody;
  if (!body.message?.trim()) {
    return NextResponse.json({ message: "message is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await chatWithKnowledgeBaseStream({
          message: body.message!.trim(),
          sessionId: body.sessionId,
          pdfContext: body.pdfContext
        });

        for await (const rawEvent of response.stream ?? []) {
          const event = rawEvent as StreamEvent;

          if (event.output?.text) {
            controller.enqueue(encoder.encode(sse({ text: event.output.text }, "token")));
          }

          if (event.citation?.generatedResponsePart?.textResponsePart?.text) {
            controller.enqueue(
              encoder.encode(
                sse(
                  {
                    citationText: event.citation.generatedResponsePart.textResponsePart.text
                  },
                  "citation"
                )
              )
            );
          }

          if (event.guardrail) {
            controller.enqueue(encoder.encode(sse(event.guardrail, "guardrail")));
          }
        }

        controller.enqueue(encoder.encode(sse({ done: true }, "done")));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Streaming request failed.";
        controller.enqueue(encoder.encode(sse({ message }, "error")));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
