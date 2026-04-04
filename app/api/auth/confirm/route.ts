import { NextResponse } from "next/server";
import { confirmSignUp } from "@/lib/auth";

type ConfirmBody = {
  email?: string;
  code?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ConfirmBody;
  if (!body.email || !body.code) {
    return NextResponse.json({ message: "Email and code are required." }, { status: 400 });
  }

  try {
    await confirmSignUp(body.email, body.code);
    return NextResponse.json({ message: "Account confirmed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm account.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
