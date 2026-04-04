import { NextResponse } from "next/server";
import {
  getAccessToken,
  getAuthenticatedUserId,
  getUserEmail
} from "@/lib/auth";
import { getProfile, upsertProfile } from "@/lib/profile";
import { getZodiacFromBirthday } from "@/lib/zodiac";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const token = await getAccessToken();
  const email = token ? await getUserEmail(token) : null;
  const profile = await getProfile(userId);

  return NextResponse.json({
    hexId: profile?.hexId ?? null,
    email,
    displayName: profile?.displayName ?? "",
    birthday: profile?.birthday ?? "",
    bio: profile?.bio ?? "",
    zodiacSign: profile?.zodiacSign ?? null
  });
}

type PutBody = {
  displayName?: string;
  birthday?: string;
  bio?: string;
};

export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PutBody;
  const zodiacSign = body.birthday
    ? getZodiacFromBirthday(body.birthday)?.name
    : undefined;

  await upsertProfile(userId, {
    displayName: body.displayName,
    birthday: body.birthday,
    bio: body.bio,
    zodiacSign
  });

  return NextResponse.json({ message: "Profile updated." });
}
