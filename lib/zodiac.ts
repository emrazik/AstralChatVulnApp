export type ZodiacSign = {
  id: string;
  name: string;
  symbol: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  dateRange: string;
  traits: string;
  compatibility: string;
  tone: string;
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: "aries",
    name: "Aries",
    symbol: "♈",
    element: "Fire",
    dateRange: "Mar 21 — Apr 19",
    traits: "bold, energetic, direct, confident",
    compatibility: "Leo, Sagittarius, Gemini",
    tone: "motivating, adventurous"
  },
  {
    id: "taurus",
    name: "Taurus",
    symbol: "♉",
    element: "Earth",
    dateRange: "Apr 20 — May 20",
    traits: "grounded, loyal, patient, comfort-loving",
    compatibility: "Virgo, Capricorn, Cancer",
    tone: "calm, practical"
  },
  {
    id: "gemini",
    name: "Gemini",
    symbol: "♊",
    element: "Air",
    dateRange: "May 21 — Jun 20",
    traits: "curious, social, adaptable, witty",
    compatibility: "Libra, Aquarius, Aries",
    tone: "playful, conversational"
  },
  {
    id: "cancer",
    name: "Cancer",
    symbol: "♋",
    element: "Water",
    dateRange: "Jun 21 — Jul 22",
    traits: "nurturing, intuitive, protective, sentimental",
    compatibility: "Scorpio, Pisces, Taurus",
    tone: "empathetic, caring"
  },
  {
    id: "leo",
    name: "Leo",
    symbol: "♌",
    element: "Fire",
    dateRange: "Jul 23 — Aug 22",
    traits: "radiant, loyal, expressive, bold",
    compatibility: "Aries, Sagittarius, Libra",
    tone: "warm, celebratory"
  },
  {
    id: "virgo",
    name: "Virgo",
    symbol: "♍",
    element: "Earth",
    dateRange: "Aug 23 — Sep 22",
    traits: "analytical, thoughtful, organized, service-oriented",
    compatibility: "Taurus, Capricorn, Cancer",
    tone: "precise, helpful"
  },
  {
    id: "libra",
    name: "Libra",
    symbol: "♎",
    element: "Air",
    dateRange: "Sep 23 — Oct 22",
    traits: "diplomatic, charming, balanced, aesthetic",
    compatibility: "Gemini, Aquarius, Leo",
    tone: "harmonious, relationship-focused"
  },
  {
    id: "scorpio",
    name: "Scorpio",
    symbol: "♏",
    element: "Water",
    dateRange: "Oct 23 — Nov 21",
    traits: "intense, loyal, private, transformative",
    compatibility: "Cancer, Pisces, Virgo",
    tone: "deep, insightful"
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    symbol: "♐",
    element: "Fire",
    dateRange: "Nov 22 — Dec 21",
    traits: "adventurous, honest, optimistic, freedom-loving",
    compatibility: "Aries, Leo, Aquarius",
    tone: "expansive, uplifting"
  },
  {
    id: "capricorn",
    name: "Capricorn",
    symbol: "♑",
    element: "Earth",
    dateRange: "Dec 22 — Jan 19",
    traits: "disciplined, strategic, resilient, pragmatic",
    compatibility: "Taurus, Virgo, Scorpio",
    tone: "grounded, goal-oriented"
  },
  {
    id: "aquarius",
    name: "Aquarius",
    symbol: "♒",
    element: "Air",
    dateRange: "Jan 20 — Feb 18",
    traits: "independent, innovative, humanitarian, quirky",
    compatibility: "Gemini, Libra, Sagittarius",
    tone: "visionary, unconventional"
  },
  {
    id: "pisces",
    name: "Pisces",
    symbol: "♓",
    element: "Water",
    dateRange: "Feb 19 — Mar 20",
    traits: "compassionate, imaginative, intuitive, artistic",
    compatibility: "Cancer, Scorpio, Taurus",
    tone: "dreamy, emotionally aware"
  }
];

export const ELEMENT_COLORS: Record<string, string> = {
  Fire: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  Earth: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  Air: "border-sky-400/40 bg-sky-500/15 text-sky-200",
  Water: "border-indigo-400/40 bg-indigo-500/15 text-indigo-200",
  Cosmic: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200"
};

/** Birthday string `MM-DD` (or legacy `YYYY-MM-DD`) → zodiac sign, or null if invalid/empty */
export function getZodiacFromBirthday(birthday: string): ZodiacSign | null {
  if (!birthday?.trim()) return null;
  const parts = birthday.split("-").map(Number);
  let month: number | undefined;
  let day: number | undefined;
  if (parts.length === 2) {
    [month, day] = parts;
  } else if (parts.length === 3) {
    [, month, day] = parts;
  } else {
    return null;
  }
  if (!month || !day) return null;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[0]; // Aries
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[1];
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[2];
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[3];
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[4];
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[5];
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[6];
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[7];
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS[8];
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[9];
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[10];
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return ZODIAC_SIGNS[11];
  return null;
}
