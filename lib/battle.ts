import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";
import { readEnv } from "@/lib/env";
import { ASTRAL_CARDS, CELESTE_CARDS } from "@/lib/cards";
import type { AstralCard } from "@/lib/cards";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Buff = {
  type: "atkUp" | "atkDown" | "defUp" | "defDown" | "spdUp" | "spdDown" | "shield" | "dodge" | "damageReduction";
  value: number;
  turnsLeft: number;
};

export type GridSlot = {
  cardId: string;
  currentHp: number;
  buffs: Buff[];
  abilityUsed: boolean;
};

export type SideState = {
  hp: number;
  deck: string[];
  hand: string[];
  grid: (GridSlot | null)[];
  discard: string[];
};

export type BattleLogEntry = {
  turn: number;
  actor: "player" | "celeste" | "system";
  message: string;
};

export type PlayAction = { type: "play"; cardId: string; slotIndex: number };
export type AttackAction = {
  type: "attack";
  fromSlot: number;
  target: { kind: "card"; slotIndex: number } | { kind: "player" };
};

export type PlayerAction = PlayAction | AttackAction;

export type CombatEvent = {
  attackerSide: "player" | "celeste";
  attackerSlot: number;
  attackerCardId: string;
  attackerName: string;
  targetKind: "card" | "player";
  targetSlot: number;
  targetCardId: string;
  targetName: string;
  damage: number;
  dodged: boolean;
  destroyed: boolean;
  newTargetHp: number;
};

export type BattleState = {
  battleId: string;
  userId: string;
  turn: number;
  phase: "play" | "attack" | "finished";
  player: SideState;
  celeste: SideState;
  status: "active" | "playerWon" | "celesteWon";
  log: BattleLogEntry[];
  createdAt: string;
  updatedAt: string;
  /** Optimistic-locking version. Incremented on every saveBattle; conditional
   *  write rejects stale updates so concurrent action requests can't clobber
   *  each other. */
  version: number;
};

export class BattleConflictError extends Error {
  constructor() {
    super("Battle state was modified by another request. Please retry.");
    this.name = "BattleConflictError";
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const BASE_DAMAGE = 5;
export const CARD_MAX_HP = 10;
export const PLAYER_MAX_HP = 30;
export const MAX_HAND_SIZE = 6;
export const GRID_SIZE = 3;

/* ------------------------------------------------------------------ */
/*  DynamoDB helpers                                                    */
/* ------------------------------------------------------------------ */

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient() {
  if (!docClient) {
    const env = readEnv();
    const raw = new DynamoDBClient({ region: env.awsRegion });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

export async function getBattle(battleId: string): Promise<BattleState | null> {
  const env = readEnv();
  const out = await getDocClient().send(
    new GetCommand({
      TableName: env.battlesTableName,
      Key: { battleId }
    })
  );
  return (out.Item as BattleState) ?? null;
}

export async function saveBattle(battle: BattleState): Promise<void> {
  const env = readEnv();
  battle.updatedAt = new Date().toISOString();
  const priorVersion = battle.version ?? 0;
  battle.version = priorVersion + 1;
  try {
    await getDocClient().send(
      new PutCommand({
        TableName: env.battlesTableName,
        Item: battle,
        // Reject if someone else has already bumped past our read.
        // `attribute_not_exists(version)` accepts rows written before this
        // field existed — they get upgraded to version 1 on next save.
        ConditionExpression:
          "attribute_not_exists(battleId) OR attribute_not_exists(version) OR version = :priorVersion",
        ExpressionAttributeValues: { ":priorVersion": priorVersion }
      })
    );
  } catch (err) {
    if ((err as { name?: string })?.name === "ConditionalCheckFailedException") {
      // Roll our in-memory version back so callers that inspect it see the
      // pre-save value.
      battle.version = priorVersion;
      throw new BattleConflictError();
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Card lookups                                                       */
/* ------------------------------------------------------------------ */

const PLAYER_CARD_MAP = new Map(ASTRAL_CARDS.map((c) => [c.id, c]));
const CELESTE_CARD_MAP = new Map(CELESTE_CARDS.map((c) => [c.id, c]));

export function lookupCard(cardId: string): AstralCard | undefined {
  return PLAYER_CARD_MAP.get(cardId) ?? CELESTE_CARD_MAP.get(cardId);
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/*  Create a new battle                                                */
/* ------------------------------------------------------------------ */

export function createBattle(battleId: string, userId: string, playerCardIds: string[]): BattleState {
  const playerDeck = shuffle(playerCardIds);
  const celesteDeck = shuffle(CELESTE_CARDS.map((c) => c.id));

  const playerHand = playerDeck.splice(0, MAX_HAND_SIZE);
  const celesteHand = celesteDeck.splice(0, MAX_HAND_SIZE);

  const now = new Date().toISOString();

  const battle: BattleState = {
    battleId,
    userId,
    turn: 1,
    phase: "play",
    player: {
      hp: PLAYER_MAX_HP,
      deck: playerDeck,
      hand: playerHand,
      grid: [null, null, null],
      discard: []
    },
    celeste: {
      hp: PLAYER_MAX_HP,
      deck: celesteDeck,
      hand: celesteHand,
      grid: [null, null, null],
      discard: []
    },
    status: "active",
    log: [{ turn: 1, actor: "system", message: "Battle started!" }],
    createdAt: now,
    updatedAt: now,
    version: 0
  };

  // Celeste places her opening cards before the player's first turn so the
  // player never gets a free swing at Celeste's HP. On-play abilities that
  // target enemy cards are no-ops here since the player grid is empty.
  runCelestePlayPhase(battle);
  cleanupDestroyed(battle.celeste, battle.log, battle.turn, "celeste");

  return battle;
}

/* ------------------------------------------------------------------ */
/*  Damage formula                                                     */
/* ------------------------------------------------------------------ */

function getEffectiveStat(base: number, slot: GridSlot, statType: "atk" | "def" | "spd"): number {
  let total = base;
  for (const b of slot.buffs) {
    if (statType === "atk" && b.type === "atkUp") total += b.value;
    if (statType === "atk" && b.type === "atkDown") total -= b.value;
    if (statType === "def" && b.type === "defUp") total += b.value;
    if (statType === "def" && b.type === "defDown") total -= b.value;
    if (statType === "spd" && b.type === "spdUp") total += b.value;
    if (statType === "spd" && b.type === "spdDown") total -= b.value;
  }
  return Math.max(0, total);
}

export function calculateDamage(attackerCard: AstralCard, attackerSlot: GridSlot, defenderCard: AstralCard | null, defenderSlot: GridSlot | null): number {
  const atk = getEffectiveStat(attackerCard.attack, attackerSlot, "atk");
  const def = defenderCard && defenderSlot
    ? getEffectiveStat(defenderCard.defense, defenderSlot, "def")
    : 0;
  const raw = BASE_DAMAGE * (1 + atk * 0.1) * (1 - def * 0.05);
  return Math.max(1, Math.floor(raw));
}

/* ------------------------------------------------------------------ */
/*  Ability effects (on-play)                                          */
/* ------------------------------------------------------------------ */

function applyAbility(card: AstralCard, slot: GridSlot, side: SideState, enemySide: SideState, log: BattleLogEntry[], turn: number, actor: "player" | "celeste"): void {
  if (slot.abilityUsed) return;
  slot.abilityUsed = true;

  switch (card.id) {
    /* ---------- Player card abilities ---------- */
    case "aries-blazing-charge":
      slot.buffs.push({ type: "atkUp", value: 3, turnsLeft: 1 });
      log.push({ turn, actor, message: `${card.name} activates Inferno Rush! ATK boosted.` });
      break;
    case "taurus-iron-bulwark":
      slot.buffs.push({ type: "shield", value: 6, turnsLeft: 2 });
      log.push({ turn, actor, message: `${card.name} raises an Earthen Wall! Shield active.` });
      break;
    case "gemini-mirror-strike":
      slot.buffs.push({ type: "dodge", value: 1, turnsLeft: 1 });
      log.push({ turn, actor, message: `${card.name} creates a Phantom Double!` });
      break;
    case "cancer-tidal-guard":
      slot.buffs.push({ type: "defUp", value: 3, turnsLeft: 2 });
      log.push({ turn, actor, message: `${card.name} summons Riptide Counter! DEF boosted.` });
      break;
    case "leo-solar-flare":
      for (const es of enemySide.grid) {
        if (es) es.buffs.push({ type: "spdDown", value: 3, turnsLeft: 2 });
      }
      log.push({ turn, actor, message: `${card.name} unleashes Corona Burst! Enemy speed reduced.` });
      break;
    case "virgo-verdant-mender": {
      const weakest = side.grid.filter((s): s is GridSlot => s !== null).sort((a, b) => a.currentHp - b.currentHp)[0];
      if (weakest) {
        weakest.currentHp = Math.min(CARD_MAX_HP, weakest.currentHp + 4);
        log.push({ turn, actor, message: `${card.name} uses Nature's Remedy! Ally healed for 4 HP.` });
      }
      break;
    }
    case "libra-gale-arbiter":
      slot.buffs.push({ type: "defUp", value: 2, turnsLeft: 2 });
      slot.buffs.push({ type: "atkUp", value: 2, turnsLeft: 2 });
      log.push({ turn, actor, message: `${card.name} summons Equilibrium Winds! Stats balanced.` });
      break;
    case "scorpio-abyssal-sting": {
      const strongest = enemySide.grid.filter((s): s is GridSlot => s !== null).sort((a, b) => b.currentHp - a.currentHp)[0];
      if (strongest) {
        strongest.currentHp -= 6;
        log.push({ turn, actor, message: `${card.name} injects Creeping Venom! Enemy takes 6 poison damage.` });
      }
      break;
    }
    case "sagittarius-ember-arrow":
      slot.buffs.push({ type: "atkUp", value: 2, turnsLeft: 2 });
      log.push({ turn, actor, message: `${card.name} ignites Piercing Flame! ATK boosted.` });
      break;
    case "capricorn-mountain-aegis":
      for (const as of side.grid) {
        if (as) as.buffs.push({ type: "defUp", value: 2, turnsLeft: 1 });
      }
      log.push({ turn, actor, message: `${card.name} activates Petrify Ward! Team defense boosted.` });
      break;
    case "aquarius-storm-surge":
      for (const es of enemySide.grid) {
        if (es) {
          es.currentHp -= 3;
          log.push({ turn, actor, message: `${card.name} hits with Chain Lightning for 3 damage!` });
        }
      }
      break;
    case "pisces-mist-veil":
      slot.buffs.push({ type: "dodge", value: 1, turnsLeft: 1 });
      log.push({ turn, actor, message: `${card.name} conjures Phantom Tide!` });
      break;

    /* ---------- Celeste card abilities ---------- */
    case "celeste-starfall-wisp":
      for (const es of enemySide.grid) {
        if (es) es.buffs.push({ type: "atkDown", value: 2, turnsLeft: 1 });
      }
      log.push({ turn, actor, message: `Starfall Wisp emits Fading Light! Enemy attack reduced.` });
      break;
    case "celeste-cosmic-dust":
      slot.buffs.push({ type: "shield", value: 4, turnsLeft: 2 });
      log.push({ turn, actor, message: `Cosmic Dust deploys Particle Shroud! Shield active.` });
      break;
    case "celeste-void-drifter":
      slot.buffs.push({ type: "dodge", value: 1, turnsLeft: 1 });
      log.push({ turn, actor, message: `Void Drifter uses Phase Slip!` });
      break;
    case "celeste-lunar-shade":
      for (const as of side.grid) {
        if (as) as.buffs.push({ type: "damageReduction", value: 1, turnsLeft: 1 });
      }
      log.push({ turn, actor, message: `Lunar Shade casts Eclipse Veil! Incoming damage reduced.` });
      break;
    case "celeste-meteor-barrage": {
      const targets = enemySide.grid.filter((s): s is GridSlot => s !== null);
      for (let i = 0; i < 3 && targets.length > 0; i++) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.currentHp -= 2;
      }
      log.push({ turn, actor, message: `Meteor Barrage rains Skyfire Volley! 3 hits of 2 damage.` });
      break;
    }
    case "celeste-solar-wind":
      for (const as of side.grid) {
        if (as) as.buffs.push({ type: "spdUp", value: 2, turnsLeft: 1 });
      }
      log.push({ turn, actor, message: `Solar Wind blasts Radiant Gust! Team speed boosted.` });
      break;
    case "celeste-comet-striker":
      slot.buffs.push({ type: "atkUp", value: 3, turnsLeft: 1 });
      log.push({ turn, actor, message: `Comet Striker ignites Tail Blaze! ATK boosted.` });
      break;
    case "celeste-pulsar-beam": {
      const target = enemySide.grid.filter((s): s is GridSlot => s !== null).sort((a, b) => a.currentHp - b.currentHp)[0];
      if (target) {
        target.currentHp -= 5;
        log.push({ turn, actor, message: `Pulsar Beam fires Rhythmic Pulse! 5 direct damage.` });
      }
      break;
    }
    case "celeste-supernova-remnant":
      for (const es of enemySide.grid) {
        if (es) es.currentHp -= 3;
      }
      log.push({ turn, actor, message: `Supernova Remnant detonates Shockwave Shell! 3 damage to all enemies.` });
      break;
    case "celeste-quasar-flare":
      slot.buffs.push({ type: "atkUp", value: 5, turnsLeft: 1 });
      slot.currentHp -= 4;
      log.push({ turn, actor, message: `Quasar Flare activates Core Ignition! Massive ATK boost at a cost.` });
      break;
    case "celeste-dark-matter-sentinel":
      for (const es of enemySide.grid) {
        if (es) es.buffs.push({ type: "spdDown", value: 3, turnsLeft: 1 });
      }
      log.push({ turn, actor, message: `Dark Matter Sentinel activates Gravity Anchor! Enemy speed crushed.` });
      break;
    case "celeste-black-hole-maw": {
      const strongest = enemySide.grid.filter((s): s is GridSlot => s !== null).sort((a, b) => b.currentHp - a.currentHp)[0];
      if (strongest) {
        strongest.currentHp -= 8;
        log.push({ turn, actor, message: `Black Hole Maw opens the Event Horizon! 8 damage to strongest enemy.` });
      }
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Remove destroyed cards                                             */
/* ------------------------------------------------------------------ */

function cleanupDestroyed(side: SideState, log: BattleLogEntry[], turn: number, actor: "player" | "celeste"): void {
  for (let i = 0; i < GRID_SIZE; i++) {
    const slot = side.grid[i];
    if (slot && slot.currentHp <= 0) {
      const card = lookupCard(slot.cardId);
      log.push({ turn, actor: "system", message: `${card?.name ?? slot.cardId} was destroyed!` });
      side.discard.push(slot.cardId);
      side.grid[i] = null;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Draw cards                                                         */
/* ------------------------------------------------------------------ */

function drawToHandSize(side: SideState): void {
  while (side.hand.length < MAX_HAND_SIZE && side.deck.length > 0) {
    side.hand.push(side.deck.shift()!);
  }
}

/* ------------------------------------------------------------------ */
/*  Tick down buffs                                                    */
/* ------------------------------------------------------------------ */

function tickBuffs(side: SideState): void {
  for (const slot of side.grid) {
    if (!slot) continue;
    slot.buffs = slot.buffs.filter((b) => {
      b.turnsLeft--;
      return b.turnsLeft > 0;
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Resolve attacks for one side                                       */
/* ------------------------------------------------------------------ */

type AttackOrder = { fromSlot: number; target: AttackAction["target"]; speed: number };

function resolveAttacks(
  attacks: AttackOrder[],
  attackerSide: SideState,
  defenderSide: SideState,
  log: BattleLogEntry[],
  turn: number,
  actor: "player" | "celeste"
): CombatEvent[] {
  const sorted = [...attacks].sort((a, b) => b.speed - a.speed || Math.random() - 0.5);
  const defenderActor: "player" | "celeste" = actor === "player" ? "celeste" : "player";
  const events: CombatEvent[] = [];

  for (const atk of sorted) {
    const slot = attackerSide.grid[atk.fromSlot];
    if (!slot || slot.currentHp <= 0) continue;
    const card = lookupCard(slot.cardId);
    if (!card) continue;

    if (atk.target.kind === "card") {
      const rawDefSlot = defenderSide.grid[atk.target.slotIndex];
      const defSlot = rawDefSlot && rawDefSlot.currentHp > 0 ? rawDefSlot : null;
      if (!defSlot) {
        if (!defenderSide.grid[atk.fromSlot]) {
          const dmg = calculateDamage(card, slot, null, null);
          defenderSide.hp = Math.max(0, defenderSide.hp - dmg);
          log.push({ turn, actor, message: `${card.name} attacks the opponent directly for ${dmg} damage!` });
          events.push({
            attackerSide: actor, attackerSlot: atk.fromSlot,
            attackerCardId: slot.cardId, attackerName: card.name,
            targetKind: "player", targetSlot: -1, targetCardId: "", targetName: defenderActor === "player" ? "You" : "Celeste",
            damage: dmg, dodged: false, destroyed: false, newTargetHp: defenderSide.hp
          });
        }
        continue;
      }

      const hasDodge = defSlot.buffs.find((b) => b.type === "dodge" && b.value > 0);
      if (hasDodge) {
        hasDodge.value--;
        if (hasDodge.value <= 0) defSlot.buffs = defSlot.buffs.filter((b) => b !== hasDodge);
        log.push({ turn, actor, message: `${card.name}'s attack was dodged!` });
        const defCard = lookupCard(defSlot.cardId);
        events.push({
          attackerSide: actor, attackerSlot: atk.fromSlot,
          attackerCardId: slot.cardId, attackerName: card.name,
          targetKind: "card", targetSlot: atk.target.slotIndex, targetCardId: defSlot.cardId, targetName: defCard?.name ?? "enemy",
          damage: 0, dodged: true, destroyed: false, newTargetHp: defSlot.currentHp
        });
        continue;
      }

      const defCard = lookupCard(defSlot.cardId);
      let dmg = calculateDamage(card, slot, defCard ?? null, defSlot);

      const reduction = defSlot.buffs.filter((b) => b.type === "damageReduction").reduce((sum, b) => sum + b.value, 0);
      dmg = Math.max(1, dmg - reduction);

      const shield = defSlot.buffs.find((b) => b.type === "shield" && b.value > 0);
      if (shield) {
        const absorbed = Math.min(shield.value, dmg);
        shield.value -= absorbed;
        dmg -= absorbed;
        if (shield.value <= 0) defSlot.buffs = defSlot.buffs.filter((b) => b !== shield);
      }

      defSlot.currentHp -= dmg;
      const destroyed = defSlot.currentHp <= 0;
      log.push({ turn, actor, message: `${card.name} attacks ${defCard?.name ?? "enemy"} for ${dmg} damage!` });
      events.push({
        attackerSide: actor, attackerSlot: atk.fromSlot,
        attackerCardId: slot.cardId, attackerName: card.name,
        targetKind: "card", targetSlot: atk.target.slotIndex, targetCardId: defSlot.cardId, targetName: defCard?.name ?? "enemy",
        damage: dmg, dodged: false, destroyed, newTargetHp: Math.max(0, defSlot.currentHp)
      });
    } else {
      if (defenderSide.grid[atk.fromSlot]) continue;

      const dmg = calculateDamage(card, slot, null, null);
      defenderSide.hp = Math.max(0, defenderSide.hp - dmg);
      log.push({ turn, actor, message: `${card.name} attacks the opponent directly for ${dmg} damage!` });
      events.push({
        attackerSide: actor, attackerSlot: atk.fromSlot,
        attackerCardId: slot.cardId, attackerName: card.name,
        targetKind: "player", targetSlot: -1, targetCardId: "", targetName: defenderActor === "player" ? "You" : "Celeste",
        damage: dmg, dodged: false, destroyed: false, newTargetHp: defenderSide.hp
      });
    }
  }
  return events;
}

/* ------------------------------------------------------------------ */
/*  Process play-phase: player places cards, then Celeste places cards */
/* ------------------------------------------------------------------ */

export function processPlays(battle: BattleState, plays: PlayAction[]): string[] {
  if (battle.phase !== "play") return ["Not in play phase"];
  const errors: string[] = [];

  for (const pa of plays) {
    const idx = battle.player.hand.indexOf(pa.cardId);
    if (idx === -1) { errors.push(`Card ${pa.cardId} not in hand`); continue; }
    if (pa.slotIndex < 0 || pa.slotIndex >= GRID_SIZE) { errors.push(`Invalid slot ${pa.slotIndex}`); continue; }
    if (battle.player.grid[pa.slotIndex] !== null) { errors.push(`Slot ${pa.slotIndex} occupied`); continue; }

    battle.player.hand.splice(idx, 1);
    const newSlot: GridSlot = { cardId: pa.cardId, currentHp: CARD_MAX_HP, buffs: [], abilityUsed: false };
    battle.player.grid[pa.slotIndex] = newSlot;

    const card = lookupCard(pa.cardId);
    if (card) {
      battle.log.push({ turn: battle.turn, actor: "player", message: `You played ${card.name} to slot ${pa.slotIndex + 1}.` });
      applyAbility(card, newSlot, battle.player, battle.celeste, battle.log, battle.turn, "player");
    }
  }

  cleanupDestroyed(battle.player, battle.log, battle.turn, "player");
  cleanupDestroyed(battle.celeste, battle.log, battle.turn, "celeste");

  battle.phase = "attack";
  return errors;
}

/* ------------------------------------------------------------------ */
/*  Process attack-phase: player attacks, then Celeste attacks         */
/* ------------------------------------------------------------------ */

export function processAttacks(battle: BattleState, attacks: AttackAction[]): { errors: string[]; combatEvents: CombatEvent[] } {
  if (battle.phase !== "attack") return { errors: ["Not in attack phase"], combatEvents: [] };
  const errors: string[] = [];
  const allEvents: CombatEvent[] = [];

  const playerOrders: AttackOrder[] = [];
  for (const aa of attacks) {
    const slot = battle.player.grid[aa.fromSlot];
    if (!slot || slot.currentHp <= 0) continue;
    const card = lookupCard(slot.cardId);
    if (!card) continue;

    if (aa.target.kind === "player" && battle.celeste.grid[aa.fromSlot]) {
      errors.push(`Cannot attack Celeste directly — slot ${aa.fromSlot} is blocked`);
      continue;
    }

    playerOrders.push({
      fromSlot: aa.fromSlot,
      target: aa.target,
      speed: getEffectiveStat(card.speed, slot, "spd")
    });
  }

  const playerEvents = resolveAttacks(playerOrders, battle.player, battle.celeste, battle.log, battle.turn, "player");
  allEvents.push(...playerEvents);
  cleanupDestroyed(battle.celeste, battle.log, battle.turn, "celeste");

  if (battle.celeste.hp <= 0) {
    battle.status = "playerWon";
    battle.phase = "finished";
    battle.log.push({ turn: battle.turn, actor: "system", message: "You defeated Celeste!" });
    return { errors, combatEvents: allEvents };
  }

  const justPlaced = runCelestePlayPhase(battle);
  cleanupDestroyed(battle.player, battle.log, battle.turn, "player");
  cleanupDestroyed(battle.celeste, battle.log, battle.turn, "celeste");

  const celesteEvents = runCelesteAttackPhase(battle, justPlaced);
  allEvents.push(...celesteEvents);

  cleanupDestroyed(battle.player, battle.log, battle.turn, "player");

  if (battle.player.hp <= 0) {
    battle.status = "celesteWon";
    battle.phase = "finished";
    battle.log.push({ turn: battle.turn, actor: "system", message: "Celeste wins the battle!" });
    return { errors, combatEvents: allEvents };
  }

  battle.turn++;
  battle.phase = "play";

  drawToHandSize(battle.player);
  drawToHandSize(battle.celeste);

  tickBuffs(battle.player);
  tickBuffs(battle.celeste);

  return { errors, combatEvents: allEvents };
}

/* ------------------------------------------------------------------ */
/*  Celeste AI — play phase                                            */
/* ------------------------------------------------------------------ */

function runCelestePlayPhase(battle: BattleState): Set<number> {
  const { celeste } = battle;
  const turn = battle.turn;
  const justPlaced = new Set<number>();

  const cardsByPriority = [...celeste.hand]
    .map((id) => ({ id, card: lookupCard(id)! }))
    .filter((c) => c.card)
    .sort((a, b) => {
      const order: Record<string, number> = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
      return (order[b.card.rarity] ?? 0) - (order[a.card.rarity] ?? 0);
    });

  for (const { id, card } of cardsByPriority) {
    const emptySlots = celeste.grid
      .map((s, i) => (s === null ? i : -1))
      .filter((i) => i >= 0);

    if (emptySlots.length === 0) break;

    const preferEmpty = emptySlots.find((i) => battle.player.grid[i] === null);
    const slotIdx = preferEmpty ?? emptySlots[0];

    const handIdx = celeste.hand.indexOf(id);
    if (handIdx === -1) continue;
    celeste.hand.splice(handIdx, 1);

    const newSlot: GridSlot = { cardId: id, currentHp: CARD_MAX_HP, buffs: [], abilityUsed: false };
    celeste.grid[slotIdx] = newSlot;
    justPlaced.add(slotIdx);

    battle.log.push({ turn, actor: "celeste", message: `Celeste played ${card.name} to slot ${slotIdx + 1}.` });
    applyAbility(card, newSlot, battle.celeste, battle.player, battle.log, turn, "celeste");
  }

  return justPlaced;
}

/* ------------------------------------------------------------------ */
/*  Celeste AI — attack phase                                          */
/* ------------------------------------------------------------------ */

function runCelesteAttackPhase(battle: BattleState, skipSlots: Set<number> = new Set()): CombatEvent[] {
  const { celeste } = battle;
  const turn = battle.turn;
  const attackOrders: AttackOrder[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    if (skipSlots.has(i)) continue;
    const slot = celeste.grid[i];
    if (!slot || slot.currentHp <= 0) continue;
    const card = lookupCard(slot.cardId);
    if (!card) continue;

    if (!battle.player.grid[i]) {
      attackOrders.push({
        fromSlot: i,
        target: { kind: "player" },
        speed: getEffectiveStat(card.speed, slot, "spd")
      });
    } else {
      const enemyCards = battle.player.grid
        .map((s, idx) => (s ? { slot: s, idx } : null))
        .filter((e): e is { slot: GridSlot; idx: number } => e !== null)
        .sort((a, b) => a.slot.currentHp - b.slot.currentHp);

      if (enemyCards.length > 0) {
        attackOrders.push({
          fromSlot: i,
          target: { kind: "card", slotIndex: enemyCards[0].idx },
          speed: getEffectiveStat(card.speed, slot, "spd")
        });
      }
    }
  }

  return resolveAttacks(attackOrders, battle.celeste, battle.player, battle.log, turn, "celeste");
}

/* ------------------------------------------------------------------ */
/*  Client-safe view (hides Celeste's hand and deck)                   */
/* ------------------------------------------------------------------ */

export type BattleView = Omit<BattleState, "celeste"> & {
  celeste: Omit<SideState, "deck" | "hand"> & { handSize: number; deckSize: number };
};

export function toBattleView(battle: BattleState): BattleView {
  const { celeste, ...rest } = battle;
  return {
    ...rest,
    celeste: {
      hp: celeste.hp,
      grid: celeste.grid,
      discard: celeste.discard,
      handSize: celeste.hand.length,
      deckSize: celeste.deck.length
    }
  };
}
