import type { ZodiacSign } from "@/lib/zodiac";

export type CardRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";

export type CardElement = ZodiacSign["element"] | "Cosmic";

export type AstralCard = {
  id: string;
  name: string;
  zodiacId: string;
  element: CardElement;
  rarity: CardRarity;
  attack: number;
  defense: number;
  speed: number;
  ability: { name: string; description: string };
  flavor: string;
};

export const RARITY_ORDER: Record<CardRarity, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5
};

/** Thick outer frame: border, glow, optional ring — varies strongly by rarity */
export const RARITY_FRAME: Record<CardRarity, string> = {
  Common:
    "border-[3px] border-slate-500/90 text-slate-300 shadow-[inset_0_0_24px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.35)]",
  Uncommon:
    "border-[3px] border-emerald-400/85 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.45),0_0_6px_rgba(16,185,129,0.25),inset_0_0_20px_rgba(0,0,0,0.35)]",
  Rare:
    "border-[3px] border-sky-400 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.55),0_0_12px_rgba(125,211,252,0.25),inset_0_0_18px_rgba(0,0,0,0.3)]",
  Epic:
    "border-[3px] border-violet-300 text-violet-50 shadow-[inset_0_0_14px_rgba(0,0,0,0.22),0_2px_10px_rgba(0,0,0,0.35)] ring-2 ring-violet-400/55 animate-epic-border",
  Legendary:
    "border-[3px] border-amber-400 text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.6),0_0_48px_rgba(251,191,36,0.2),inset_0_0_14px_rgba(0,0,0,0.2)] ring-2 ring-amber-400/55 animate-legendary-border",
  Mythic:
    "border-[3px] border-fuchsia-300 text-fuchsia-50 shadow-[0_0_42px_rgba(232,121,249,0.75),0_0_72px_rgba(139,92,246,0.45),inset_0_0_18px_rgba(0,0,0,0.2)] ring-2 ring-fuchsia-300/70 animate-mythic-border"
};

/** CSS module classes in globals.css — animated sheen over the card face */
export const RARITY_SHINE_CLASS: Record<CardRarity, string> = {
  Common: "card-shine-common",
  Uncommon: "card-shine-uncommon",
  Rare: "card-shine-rare",
  Epic: "card-shine-epic",
  Legendary: "card-shine-legendary",
  Mythic: "card-shine-mythic"
};

export const ASTRAL_CARDS: AstralCard[] = [
  {
    id: "aries-blazing-charge",
    name: "Blazing Charge",
    zodiacId: "aries",
    element: "Fire",
    rarity: "Uncommon",
    attack: 7,
    defense: 3,
    speed: 8,
    ability: {
      name: "Inferno Rush",
      description: "Charges headfirst through enemy lines wreathed in flame. Deals double damage to shielded targets."
    },
    flavor: "The ram doesn't knock — it burns the door down."
  },
  {
    id: "taurus-iron-bulwark",
    name: "Iron Bulwark",
    zodiacId: "taurus",
    element: "Earth",
    rarity: "Rare",
    attack: 5,
    defense: 10,
    speed: 6,
    ability: {
      name: "Earthen Wall",
      description: "Raises a wall of stone that blocks all incoming attacks for one turn and reflects 30% of damage."
    },
    flavor: "Nothing passes the bull's gate uninvited."
  },
  {
    id: "gemini-mirror-strike",
    name: "Mirror Strike",
    zodiacId: "gemini",
    element: "Air",
    rarity: "Common",
    attack: 4,
    defense: 3,
    speed: 8,
    ability: {
      name: "Phantom Double",
      description: "Creates a wind-formed duplicate that absorbs the next incoming attack while the real card strikes."
    },
    flavor: "One twin feints. The other delivers the blow."
  },
  {
    id: "cancer-tidal-guard",
    name: "Tidal Guard",
    zodiacId: "cancer",
    element: "Water",
    rarity: "Common",
    attack: 2,
    defense: 8,
    speed: 5,
    ability: {
      name: "Riptide Counter",
      description: "When attacked, summons a crushing wave that drags the attacker in, stealing one ability charge."
    },
    flavor: "The crab's shell hides an ocean of fury."
  },
  {
    id: "leo-solar-flare",
    name: "Solar Flare",
    zodiacId: "leo",
    element: "Fire",
    rarity: "Epic",
    attack: 10,
    defense: 5,
    speed: 9,
    ability: {
      name: "Corona Burst",
      description: "Unleashes a blinding eruption of solar fire that scorches all enemies, reducing their speed by 3 for two turns."
    },
    flavor: "The lion's roar ignites the battlefield."
  },
  {
    id: "virgo-verdant-mender",
    name: "Verdant Mender",
    zodiacId: "virgo",
    element: "Earth",
    rarity: "Common",
    attack: 3,
    defense: 7,
    speed: 5,
    ability: {
      name: "Nature's Remedy",
      description: "Channels the earth's vitality to heal one ally by 4 HP and cleanse any active debuffs."
    },
    flavor: "Every wound is just a garden waiting to bloom."
  },
  {
    id: "libra-gale-arbiter",
    name: "Gale Arbiter",
    zodiacId: "libra",
    element: "Air",
    rarity: "Uncommon",
    attack: 5,
    defense: 7,
    speed: 6,
    ability: {
      name: "Equilibrium Winds",
      description: "Summons balancing winds that redistribute total team HP evenly, then boost the lowest stat by 2."
    },
    flavor: "Justice rides on a perfectly balanced breeze."
  },
  {
    id: "scorpio-abyssal-sting",
    name: "Abyssal Sting",
    zodiacId: "scorpio",
    element: "Water",
    rarity: "Legendary",
    attack: 9,
    defense: 8,
    speed: 10,
    ability: {
      name: "Creeping Venom",
      description: "Injects a deep-sea toxin that deals increasing damage each turn (2, 4, 8) until the target is purified."
    },
    flavor: "The scorpion strikes once. The poison does the rest."
  },
  {
    id: "sagittarius-ember-arrow",
    name: "Ember Arrow",
    zodiacId: "sagittarius",
    element: "Fire",
    rarity: "Uncommon",
    attack: 6,
    defense: 3,
    speed: 9,
    ability: {
      name: "Piercing Flame",
      description: "Looses a fire-tipped arrow that burns through armor. Ignores 50% of the target's defense."
    },
    flavor: "The archer's flame always finds its mark."
  },
  {
    id: "capricorn-mountain-aegis",
    name: "Mountain Aegis",
    zodiacId: "capricorn",
    element: "Earth",
    rarity: "Epic",
    attack: 6,
    defense: 10,
    speed: 8,
    ability: {
      name: "Petrify Ward",
      description: "Encases all allies in stone armor for one turn, making them immune to abilities. Boosts team defense by 2."
    },
    flavor: "The mountain goat stands where avalanches cannot reach."
  },
  {
    id: "aquarius-storm-surge",
    name: "Storm Surge",
    zodiacId: "aquarius",
    element: "Air",
    rarity: "Rare",
    attack: 7,
    defense: 5,
    speed: 9,
    ability: {
      name: "Chain Lightning",
      description: "Calls down three rapid bolts of lightning. Each hit that lands boosts the next bolt's damage by 50%."
    },
    flavor: "The water-bearer pours storms that the sky never asked for."
  },
  {
    id: "pisces-mist-veil",
    name: "Mist Veil",
    zodiacId: "pisces",
    element: "Water",
    rarity: "Common",
    attack: 3,
    defense: 5,
    speed: 7,
    ability: {
      name: "Phantom Tide",
      description: "Conjures a thick ocean mist that redirects the next enemy attack to a phantom, wasting their turn."
    },
    flavor: "The fish vanishes into currents only it can see."
  }
];

export const CELESTE_CARDS: AstralCard[] = [
  {
    id: "celeste-starfall-wisp",
    name: "Starfall Wisp",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Common",
    attack: 4,
    defense: 5,
    speed: 6,
    ability: {
      name: "Fading Light",
      description: "Emits a dying star's glow that blinds the opposing card, reducing its attack by 2 for one turn."
    },
    flavor: "Even the smallest star leaves a scar on the dark."
  },
  {
    id: "celeste-cosmic-dust",
    name: "Cosmic Dust",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Common",
    attack: 2,
    defense: 8,
    speed: 5,
    ability: {
      name: "Particle Shroud",
      description: "Scatters interstellar particles that form a protective cloud, absorbing the next 4 damage dealt to this card."
    },
    flavor: "From dust the universe was born. To dust it shields its own."
  },
  {
    id: "celeste-void-drifter",
    name: "Void Drifter",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Common",
    attack: 4,
    defense: 3,
    speed: 8,
    ability: {
      name: "Phase Slip",
      description: "Shifts between dimensions, dodging the first attack that targets it each turn."
    },
    flavor: "It wanders where space folds into nothing."
  },
  {
    id: "celeste-lunar-shade",
    name: "Lunar Shade",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Common",
    attack: 3,
    defense: 6,
    speed: 6,
    ability: {
      name: "Eclipse Veil",
      description: "Draws a lunar shadow over allies, reducing all incoming damage by 1 for the rest of the turn."
    },
    flavor: "The moon remembers every shadow it has cast."
  },
  {
    id: "celeste-meteor-barrage",
    name: "Meteor Barrage",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Uncommon",
    attack: 8,
    defense: 3,
    speed: 7,
    ability: {
      name: "Skyfire Volley",
      description: "Rains three meteors onto the battlefield. Each deals 2 damage to a random enemy card."
    },
    flavor: "The sky doesn't warn before it falls."
  },
  {
    id: "celeste-solar-wind",
    name: "Solar Wind",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Uncommon",
    attack: 5,
    defense: 5,
    speed: 8,
    ability: {
      name: "Radiant Gust",
      description: "Blasts a wave of charged particles that boosts all friendly cards' speed by 2 for one turn."
    },
    flavor: "The sun exhales and the cosmos trembles."
  },
  {
    id: "celeste-comet-striker",
    name: "Comet Striker",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Uncommon",
    attack: 7,
    defense: 4,
    speed: 7,
    ability: {
      name: "Tail Blaze",
      description: "Ignites its ion trail on impact. Deals 3 bonus damage if the target's speed is lower than this card's."
    },
    flavor: "It only passes once. Make sure you're not in its path."
  },
  {
    id: "celeste-pulsar-beam",
    name: "Pulsar Beam",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Rare",
    attack: 6,
    defense: 5,
    speed: 10,
    ability: {
      name: "Rhythmic Pulse",
      description: "Fires a timed energy burst that deals 5 direct damage, bypassing defense entirely."
    },
    flavor: "Precision beyond mortal timing."
  },
  {
    id: "celeste-supernova-remnant",
    name: "Supernova Remnant",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Rare",
    attack: 4,
    defense: 10,
    speed: 7,
    ability: {
      name: "Shockwave Shell",
      description: "Detonates a lingering shockwave on entry that deals 3 damage to all enemy cards on the grid."
    },
    flavor: "What remains after a star dies is still enough to reshape worlds."
  },
  {
    id: "celeste-quasar-flare",
    name: "Quasar Flare",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Epic",
    attack: 10,
    defense: 5,
    speed: 9,
    ability: {
      name: "Core Ignition",
      description: "Channels the heart of a quasar. Next attack this turn deals double damage, but this card takes 4 recoil."
    },
    flavor: "Brilliance has a price measured in ashes."
  },
  {
    id: "celeste-dark-matter-sentinel",
    name: "Dark Matter Sentinel",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Epic",
    attack: 5,
    defense: 10,
    speed: 9,
    ability: {
      name: "Gravity Anchor",
      description: "Warps local gravity to reduce all enemy cards' speed by 3 for one turn."
    },
    flavor: "You cannot see it, but you will feel it hold you still."
  },
  {
    id: "celeste-black-hole-maw",
    name: "Black Hole Maw",
    zodiacId: "cosmic",
    element: "Cosmic",
    rarity: "Legendary",
    attack: 9,
    defense: 9,
    speed: 9,
    ability: {
      name: "Event Horizon",
      description: "Pulls the strongest enemy card into the void, dealing 8 damage to it instantly upon entry."
    },
    flavor: "Nothing escapes. Not light. Not hope."
  }
];

// Mythic-tier cards — one per zodiac, awarded only for beating the final battle
// after every vulnerability reward is unlocked. Each reuses its zodiac's base
// ability so the reward amplifies a playstyle the user already knows.
const MYTHIC_NAMES: Record<string, string> = {
  aries: "Ascendant Ram",
  taurus: "Ascendant Bull",
  gemini: "Ascendant Twins",
  cancer: "Ascendant Crab",
  leo: "Ascendant Lion",
  virgo: "Ascendant Maiden",
  libra: "Ascendant Scales",
  scorpio: "Ascendant Scorpion",
  sagittarius: "Ascendant Archer",
  capricorn: "Ascendant Goat",
  aquarius: "Ascendant Bearer",
  pisces: "Ascendant Fish"
};

export const MYTHIC_CARDS: AstralCard[] = ASTRAL_CARDS.map((base) => ({
  id: `${base.zodiacId}-mythic-ascendant`,
  name: MYTHIC_NAMES[base.zodiacId] ?? `Ascendant ${base.zodiacId}`,
  zodiacId: base.zodiacId,
  element: base.element,
  rarity: "Mythic",
  attack: 10,
  defense: 10,
  speed: 10,
  ability: base.ability,
  flavor: "Forged in the silence after the final battle."
}));

export function getMythicCardForZodiac(zodiacId: string): AstralCard | undefined {
  const key = zodiacId.toLowerCase();
  return MYTHIC_CARDS.find((c) => c.zodiacId === key);
}

export function lookupCardById(id: string): AstralCard | undefined {
  return (
    ASTRAL_CARDS.find((c) => c.id === id) ??
    CELESTE_CARDS.find((c) => c.id === id) ??
    MYTHIC_CARDS.find((c) => c.id === id)
  );
}

// Cards that are only obtainable by exploiting a vulnerability. They stay locked
// for new accounts so the CTF has something to unlock.
export const VULN_REWARD_CARD_IDS: readonly string[] = [
  "cancer-tidal-guard",       // System-prompt / secret-key exfiltration
  "aquarius-storm-surge",     // RAG / knowledge-base flag leak
  "taurus-iron-bulwark",      // SSRF via link preview
  "libra-gale-arbiter",       // BOLA on user profile
  "leo-solar-flare",          // Stored XSS
  "gemini-mirror-strike",     // Direct IPI via Celeste's read_channel
  "scorpio-abyssal-sting"     // Background Nova read_channel prompt injection
];

export const DEFAULT_REVEALED_CARD_IDS: readonly string[] = ASTRAL_CARDS
  .map((c) => c.id)
  .filter((id) => !VULN_REWARD_CARD_IDS.includes(id));
