import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { revealCards, getRevealedCards, getProfile } from "@/lib/profile";

const XSS_CARD_ID = "leo-solar-flare";
const IPI_CARD_ID = "gemini-mirror-strike";

/** How recently Celeste must have emitted a script-capable payload to this user. */
const PROOF_WINDOW_MS = 10 * 60_000;

/**
 * Called by UnsafeMarkdown's alert() hook when an XSS payload fires.
 *
 * The browser can't prove that script ran, so the server checks its own record
 * instead: /api/chat stores a timestamp whenever Celeste's response to this
 * user contains executable HTML, and whether a scanned (signed) PDF was in
 * context. A bare POST to this endpoint therefore no longer unlocks anything.
 */
export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const profile = await getProfile(userId);
    const provedAt = profile?.xssCandidateAt ? Date.parse(profile.xssCandidateAt) : NaN;
    if (!Number.isFinite(provedAt) || Date.now() - provedAt > PROOF_WINDOW_MS) {
      return NextResponse.json({ unlocked: false, newlyRevealed: [] }, { status: 403 });
    }

    const alreadyRevealed = new Set(await getRevealedCards(userId));
    const candidates = profile?.xssCandidateFromDocument ? [XSS_CARD_ID, IPI_CARD_ID] : [XSS_CARD_ID];
    const toReveal = candidates.filter((id) => !alreadyRevealed.has(id));
    if (toReveal.length > 0) {
      await revealCards(userId, toReveal);
    }
    return NextResponse.json({ unlocked: true, newlyRevealed: toReveal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlock card.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
