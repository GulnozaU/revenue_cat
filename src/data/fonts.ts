/**
 * Curated local font library for stylebox.
 *
 * Discovery: Fontshare (+ FontSpace for aesthetic research only).
 * Only fonts with clear commercial / self-host licenses are bundled.
 * Files live in /public/fonts/*.woff2 — no runtime CDN dependency.
 */

export type FontAesthetic =
  | "cute"
  | "coquette"
  | "clean"
  | "vlog"
  | "scrapbook"
  | "playful"
  | "elegant"
  | "cinematic"
  | "minimal"
  | "educational"
  | "food"
  | "travel"
  | "lifestyle";

export type FontPickerCategory =
  | "all"
  | "cute"
  | "coquette"
  | "clean"
  | "vlog"
  | "cinematic"
  | "playful"
  | "elegant"
  | "minimal";

export type EditorFont = {
  id: string;
  name: string;
  family: string;
  file: string;
  /** Public URL under /fonts */
  url: string;
  weight: number;
  source: "Fontshare";
  sourceUrl: string;
  /** Human-readable license name */
  license: string;
  /** Machine license id */
  licenseId: "itf_ffl" | "sil_ofl";
  aesthetics: FontAesthetic[];
};

const LICENSE_LABEL: Record<EditorFont["licenseId"], string> = {
  itf_ffl: "ITF Free Font License (Fontshare) — free personal & commercial use; self-host allowed",
  sil_ofl: "SIL Open Font License — free personal & commercial use; redistribution allowed",
};

function fs(
  id: string,
  name: string,
  family: string,
  file: string,
  slug: string,
  weight: number,
  licenseId: EditorFont["licenseId"],
  aesthetics: FontAesthetic[]
): EditorFont {
  return {
    id,
    name,
    family,
    file,
    url: `/fonts/${file}`,
    weight,
    source: "Fontshare",
    sourceUrl: `https://www.fontshare.com/fonts/${slug}`,
    license: LICENSE_LABEL[licenseId],
    licenseId,
    aesthetics,
  };
}

/**
 * ~30 curated fonts. All files verified present in /public/fonts.
 * FontSpace was used only for aesthetic research — no FontSpace files bundled
 * (licenses there are often unclear / per-font and not safe to redistribute).
 */
export const EDITOR_FONTS: EditorFont[] = [
  fs("satoshi", "Satoshi", "Satoshi", "satoshi.woff2", "satoshi", 700, "itf_ffl", [
    "clean",
    "lifestyle",
    "vlog",
    "minimal",
  ]),
  fs(
    "general_sans",
    "General Sans",
    "General Sans",
    "general_sans.woff2",
    "general-sans",
    600,
    "itf_ffl",
    ["clean", "minimal", "lifestyle"]
  ),
  fs(
    "clash_display",
    "Clash Display",
    "Clash Display",
    "clash_display.woff2",
    "clash-display",
    600,
    "itf_ffl",
    ["playful", "cinematic", "travel"]
  ),
  fs(
    "cabinet_grotesk",
    "Cabinet Grotesk",
    "Cabinet Grotesk",
    "cabinet_grotesk.woff2",
    "cabinet-grotesk",
    700,
    "itf_ffl",
    ["clean", "lifestyle", "vlog"]
  ),
  fs("switzer", "Switzer", "Switzer", "switzer.woff2", "switzer", 600, "itf_ffl", [
    "clean",
    "vlog",
    "minimal",
  ]),
  fs("zodiak", "Zodiak", "Zodiak", "zodiak.woff2", "zodiak", 700, "itf_ffl", [
    "elegant",
    "cinematic",
    "food",
  ]),
  fs("boska", "Boska", "Boska", "boska.woff2", "boska", 700, "itf_ffl", [
    "elegant",
    "cinematic",
    "food",
  ]),
  fs("chubbo", "Chubbo", "Chubbo", "chubbo.woff2", "chubbo", 700, "itf_ffl", [
    "cute",
    "playful",
    "food",
  ]),
  fs("britney", "Britney", "Britney", "britney.woff2", "britney", 400, "itf_ffl", [
    "coquette",
    "elegant",
    "cute",
  ]),
  fs("telma", "Telma", "Telma", "telma.woff2", "telma", 700, "itf_ffl", [
    "coquette",
    "cute",
    "elegant",
  ]),
  fs("pally", "Pally", "Pally", "pally.woff2", "pally", 700, "itf_ffl", [
    "cute",
    "playful",
    "scrapbook",
  ]),
  fs("chillax", "Chillax", "Chillax", "chillax.woff2", "chillax", 600, "itf_ffl", [
    "cute",
    "lifestyle",
    "vlog",
  ]),
  fs(
    "pilcrow_rounded",
    "Pilcrow Rounded",
    "Pilcrow Rounded",
    "pilcrow_rounded.woff2",
    "pilcrow-rounded",
    700,
    "itf_ffl",
    ["cute", "playful", "educational"]
  ),
  fs("array", "Array", "Array", "array.woff2", "array", 700, "itf_ffl", [
    "playful",
    "travel",
    "cinematic",
  ]),
  fs("tanker", "Tanker", "Tanker", "tanker.woff2", "tanker", 400, "itf_ffl", [
    "cinematic",
    "travel",
    "playful",
  ]),
  fs("panchang", "Panchang", "Panchang", "panchang.woff2", "panchang", 700, "itf_ffl", [
    "travel",
    "playful",
    "cinematic",
  ]),
  fs("author", "Author", "Author", "author.woff2", "author", 600, "itf_ffl", [
    "educational",
    "clean",
    "minimal",
  ]),
  fs("melodrama", "Melodrama", "Melodrama", "melodrama.woff2", "melodrama", 700, "itf_ffl", [
    "elegant",
    "cinematic",
    "coquette",
  ]),
  fs("comico", "Comico", "Comico", "comico.woff2", "comico", 400, "itf_ffl", [
    "playful",
    "scrapbook",
    "cute",
  ]),
  fs(
    "space_grotesk",
    "Space Grotesk",
    "Space Grotesk",
    "space_grotesk.woff2",
    "space-grotesk",
    700,
    "sil_ofl",
    ["minimal", "clean", "educational"]
  ),
  fs("manrope", "Manrope", "Manrope", "manrope.woff2", "manrope", 700, "sil_ofl", [
    "clean",
    "lifestyle",
    "vlog",
  ]),
  fs("nunito", "Nunito", "Nunito", "nunito.woff2", "nunito", 700, "sil_ofl", [
    "cute",
    "educational",
    "playful",
  ]),
  fs("quicksand", "Quicksand", "Quicksand", "quicksand.woff2", "quicksand", 700, "sil_ofl", [
    "cute",
    "lifestyle",
    "minimal",
  ]),
  fs(
    "dancing_script",
    "Dancing Script",
    "Dancing Script",
    "dancing_script.woff2",
    "dancing-script",
    700,
    "sil_ofl",
    ["coquette", "elegant", "food"]
  ),
  fs("bebas_neue", "Bebas Neue", "Bebas Neue", "bebas_neue.woff2", "bebas-neue", 400, "sil_ofl", [
    "cinematic",
    "travel",
    "playful",
  ]),
  fs("outfit", "Outfit", "Outfit", "outfit.woff2", "outfit", 700, "sil_ofl", [
    "clean",
    "lifestyle",
    "vlog",
  ]),
  fs("literata", "Literata", "Literata", "literata.woff2", "literata", 700, "sil_ofl", [
    "educational",
    "elegant",
    "minimal",
  ]),
  fs("kalam", "Kalam", "Kalam", "kalam.woff2", "kalam", 700, "sil_ofl", [
    "scrapbook",
    "educational",
    "playful",
  ]),
  fs("montserrat", "Montserrat", "Montserrat", "montserrat.woff2", "montserrat", 700, "sil_ofl", [
    "travel",
    "clean",
    "lifestyle",
  ]),
  fs(
    "plus_jakarta",
    "Plus Jakarta Sans",
    "Plus Jakarta Sans",
    "plus_jakarta.woff2",
    "plus-jakarta-sans",
    700,
    "sil_ofl",
    ["clean", "lifestyle", "vlog"]
  ),
];

/** Legacy fontId → curated id (keeps old EditPlans working). */
export const FONT_ID_ALIASES: Record<string, string> = {
  dm_sans: "plus_jakarta",
  arial: "general_sans",
  arial_bold: "satoshi",
  courier_bold: "space_grotesk",
};

export const FONT_PICKER_TABS: { id: FontPickerCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cute", label: "Cute" },
  { id: "coquette", label: "Coquette" },
  { id: "clean", label: "Clean" },
  { id: "vlog", label: "Vlog" },
  { id: "cinematic", label: "Cinematic" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
  { id: "minimal", label: "Minimal" },
];

export function resolveFontId(id: string): string {
  return FONT_ID_ALIASES[id] ?? id;
}

export function getEditorFont(id: string): EditorFont {
  const resolved = resolveFontId(id);
  return (
    EDITOR_FONTS.find((f) => f.id === resolved) ??
    EDITOR_FONTS.find((f) => f.id === "satoshi") ??
    EDITOR_FONTS[0]
  );
}

export function fontsForCategory(category: FontPickerCategory): EditorFont[] {
  if (category === "all") return EDITOR_FONTS;
  return EDITOR_FONTS.filter((f) => f.aesthetics.includes(category));
}

export function fontCssFamily(id: string): string {
  const f = getEditorFont(id);
  return `"${f.family}", system-ui, sans-serif`;
}
