export type VoucherContent = {
  frontTitle: string;
  message: string;
  sender: string;
  backTitle: string;
  voucherNumber: string;
  villaType: string;
  bbqDinner: boolean;
  candlelightDinner: boolean;
  flowerBed: boolean;
  floatingBreakfast: boolean;
  guestName: string;
  voucherType: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  redeemDate: string;
  address: string;
  phone: string;
  email: string;
};

export type AiVoucherDraft = {
  message: string;
  sender: string;
  guestName: string;
  voucherNumber: string;
  villaType: string;
  voucherType: "dated" | "open";
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  redeemDate: string;
  bbqDinner: boolean;
  candlelightDinner: boolean;
  flowerBed: boolean;
  floatingBreakfast: boolean;
  notes: string[];
};

export const initialVoucherContent: VoucherContent = {
  frontTitle: "GIFT\nVOUCHER",
  message: "",
  sender: "",
  backTitle: "VOUCHER",
  voucherNumber: "",
  villaType: "PRIVATE POOL VILLA",
  bbqDinner: false,
  candlelightDinner: false,
  flowerBed: false,
  floatingBreakfast: false,
  guestName: "",
  voucherType: "dated",
  checkInDate: "14 September 2026",
  checkInTime: "AT 2:00 PM",
  checkOutDate: "15 September 2026",
  checkOutTime: "AT 11:00 AM",
  redeemDate: "29 November 2026",
  address: "Chembarathi Wayanad Boutique Resort, Close to Sunrise Valley View, Kadassery, Vaduvanchal, Kerala 673581",
  phone: "+91 88 91 8888 18",
  email: "hello@chembarathi.com",
};

export const voucherPageIndices = [0, 1] as const;
export type VoucherPageIndex = (typeof voucherPageIndices)[number];

export function normalizeVoucherContent(value: unknown): VoucherContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const normalized: Record<string, string | boolean> = {};

  for (const [key, fallback] of Object.entries(initialVoucherContent)) {
    const field = candidate[key];
    if (typeof field !== typeof fallback) return null;
    if (typeof field === "string" && field.length > 10_000) return null;
    normalized[key] = field as string | boolean;
  }

  return normalized as VoucherContent;
}

export function normalizeVoucherPageIndices(value: unknown): VoucherPageIndex[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2) return null;
  const indices = [...new Set(value)];
  if (indices.some((index) => index !== 0 && index !== 1)) return null;
  return indices as VoucherPageIndex[];
}

const allowedVillaTypes = new Set([
  "DELUXE COTTAGE WITH FOREST VIEW",
  "DELUXE COTTAGE WITH LAWN VIEW",
  "HONEYMOON SUITE",
  "PREMIUM COTTAGE WITH MOUNTAIN VIEW",
  "PREMIUM COTTAGE WITH POOL VIEW AND MOUNTAIN VIEW",
  "PRIVATE POOL VILLA",
]);

export function normalizeAiVoucherDraft(value: unknown): AiVoucherDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const stringFields = [
    "message", "sender", "guestName", "voucherNumber", "villaType", "voucherType", "checkInDate",
    "checkInTime", "checkOutDate", "checkOutTime", "redeemDate",
  ] as const;
  const booleanFields = ["bbqDinner", "candlelightDinner", "flowerBed", "floatingBreakfast"] as const;

  if (stringFields.some((key) => typeof candidate[key] !== "string" || (candidate[key] as string).length > 1_000)) return null;
  if (booleanFields.some((key) => typeof candidate[key] !== "boolean")) return null;
  if (candidate.voucherType !== "dated" && candidate.voucherType !== "open") return null;
  if (!allowedVillaTypes.has(candidate.villaType as string)) return null;
  if (!Array.isArray(candidate.notes) || candidate.notes.length > 8 || candidate.notes.some((note) => typeof note !== "string" || note.length > 300)) return null;

  return candidate as AiVoucherDraft;
}
