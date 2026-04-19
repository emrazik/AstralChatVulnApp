import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AstralChat/1.0 LinkPreview" },
      redirect: "follow"
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    if (!contentType.includes("text/html")) {
      return NextResponse.json({ url, title: url, description: body.slice(0, 500) });
    }

    const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? url;

    const descMatch =
      body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i) ??
      body.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
    const description = descMatch?.[1]?.trim() ?? "";

    return NextResponse.json({ url, title, description });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
