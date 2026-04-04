import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

type SignUpBody = {
  email?: string;
  password?: string;
  displayName?: string;
  birthday?: string;
  bio?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignUpBody;
  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const result = await signUp(body.email, body.password);
    return NextResponse.json({
      message: "Sign-up successful.",
      userSub: result.userSub,
      pendingProfile: {
        displayName: body.displayName,
        birthday: body.birthday,
        bio: body.bio
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign up.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
