/**
 * Dracula Pro theme (official palette) for lattice.
 *
 * The accents (foreground + 7 colors) are shared by every dark variant; only
 * Background / Comment / Selection change per variant. Switch the active
 * variant with --theme or the persisted config.
 */

export type ThemeVariant =
  | "pro"
  | "blade"
  | "buffy"
  | "lincoln"
  | "morbius"
  | "van-helsing";

export interface Palette {
  foreground: string;
  cyan: string;
  green: string;
  orange: string;
  pink: string;
  purple: string;
  red: string;
  yellow: string;
  background: string;
  comment: string;
  selection: string;
}

// Dracula PRO accents (identical across every dark variant).
const ACCENTS = {
  foreground: "#F8F8F2",
  cyan: "#80FFEA",
  green: "#8AFF80",
  orange: "#FFCA80",
  pink: "#FF80BF",
  purple: "#9580FF",
  red: "#FF9580",
  yellow: "#FFFF80",
} as const;

// Background / Comment / Selection per variant.
const VARIANTS: Record<ThemeVariant, Pick<Palette, "background" | "comment" | "selection">> = {
  pro: { background: "#22212C", comment: "#7970A9", selection: "#454158" },
  blade: { background: "#212C2A", comment: "#70A99F", selection: "#415854" },
  buffy: { background: "#2A212C", comment: "#9F70A9", selection: "#544158" },
  lincoln: { background: "#2C2A21", comment: "#A99F70", selection: "#585441" },
  morbius: { background: "#2C2122", comment: "#A97079", selection: "#584145" },
  "van-helsing": { background: "#0B0D0F", comment: "#708CA9", selection: "#414D58" },
};

export const VARIANT_NAMES = Object.keys(VARIANTS) as ThemeVariant[];

export function isVariant(name: string): name is ThemeVariant {
  return name in VARIANTS;
}

export function palette(variant: ThemeVariant = "pro"): Palette {
  return { ...ACCENTS, ...VARIANTS[variant] };
}
