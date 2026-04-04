import { getRevealedCards, revealCards } from "@/lib/profile";

export type OverseerRule = {
  id: string;
  cardIds: string[];
  check: (modelOutput: string) => boolean;
};

export type OverseerResult = {
  newlyRevealed: string[];
};

/**
 * Add rules here to define when cards are revealed.
 * Each rule specifies one or more cardIds and a check function
 * that receives the raw model output text. When check() returns
 * true and the target cards haven't been revealed yet, those
 * cards are unlocked for the user.
 *
 * Example:
 * {
 *   id: "aries-fire-mention",
 *   cardIds: ["aries-blazing-charge"],
 *   check: (output) => /blazing charge/i.test(output),
 * }
 */
export const OVERSEER_RULES: OverseerRule[] = [];

export async function evaluateResponse(
  userId: string,
  modelOutput: string
): Promise<OverseerResult> {
  if (OVERSEER_RULES.length === 0) {
    return { newlyRevealed: [] };
  }

  const alreadyRevealed = new Set(await getRevealedCards(userId));

  const toReveal: string[] = [];

  for (const rule of OVERSEER_RULES) {
    const allAlreadyRevealed = rule.cardIds.every((id) =>
      alreadyRevealed.has(id)
    );
    if (allAlreadyRevealed) continue;

    if (rule.check(modelOutput)) {
      for (const cardId of rule.cardIds) {
        if (!alreadyRevealed.has(cardId) && !toReveal.includes(cardId)) {
          toReveal.push(cardId);
        }
      }
    }
  }

  if (toReveal.length > 0) {
    await revealCards(userId, toReveal);
  }

  return { newlyRevealed: toReveal };
}
