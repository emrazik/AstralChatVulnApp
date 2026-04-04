import { NextResponse } from "next/server";
import { changePassword, getAccessToken } from "@/lib/auth";

type PutBody = {
  currentPassword?: string;
  newPassword?: string;
};

export async function PUT(request: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PutBody;
  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { message: "Current and new password are required." },
      { status: 400 }
    );
  }
  if (body.newPassword.length < 12) {
    return NextResponse.json(
      { message: "New password must be at least 12 characters." },
      { status: 400 }
    );
  }

  try {
    await changePassword(token, body.currentPassword, body.newPassword);
    return NextResponse.json({ message: "Password updated." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to change password.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
