import { NextResponse } from "next/server";
import { AUTH_COOKIE, signIn } from "@/lib/auth";
import { upsertProfile } from "@/lib/profile";
import { getZodiacFromBirthday } from "@/lib/zodiac";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { readCognitoEnv } from "@/lib/env";

type LoginBody = {
  email?: string;
  password?: string;
  pendingProfile?: {
    displayName?: string;
    birthday?: string;
    bio?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const accessToken = await signIn(body.email, body.password);

    if (body.pendingProfile?.displayName || body.pendingProfile?.birthday) {
      const env = readCognitoEnv();
      const verifier = CognitoJwtVerifier.create({
        userPoolId: env.cognitoUserPoolId,
        tokenUse: "access" as const,
        clientId: env.cognitoClientId
      });
      const payload = await verifier.verify(accessToken);
      const userId = payload.sub;
      if (userId) {
        const zodiacSign = body.pendingProfile.birthday
          ? getZodiacFromBirthday(body.pendingProfile.birthday)?.name
          : undefined;
        await upsertProfile(userId, {
          displayName: body.pendingProfile.displayName,
          birthday: body.pendingProfile.birthday,
          bio: body.pendingProfile.bio,
          zodiacSign
        });
      }
    }

    const response = NextResponse.json({ message: "Signed in." });
    response.cookies.set(AUTH_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ message }, { status: 401 });
  }
}
