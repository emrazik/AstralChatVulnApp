import { NextResponse } from "next/server";
import { adminConfirmSignUp, signUp } from "@/lib/auth";
import { clientIp, isKeyRateLimited } from "@/lib/rate-limit";

// Accounts are auto-confirmed (no email round-trip), so throttle creation per
// client IP. Each account gets its own chat budget, so unthrottled sign-ups
// would multiply Bedrock spend.
const SIGNUPS_PER_IP_PER_HOUR = 5;

type SignUpBody = {
  email?: string;
  password?: string;
  displayName?: string;
  birthday?: string;
  bio?: string;
};

export async function POST(request: Request) {
  if (isKeyRateLimited(`signup:${clientIp(request)}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60_000)) {
    return NextResponse.json(
      { message: "Too many sign-ups from this network. Try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SignUpBody;
  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const result = await signUp(body.email, body.password);
    await adminConfirmSignUp(body.email);
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
