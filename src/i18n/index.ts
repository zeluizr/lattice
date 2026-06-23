import { en, type Translation, type TranslationKey } from "./en.js";
import { es } from "./es.js";
import { ptBR } from "./pt-BR.js";

export type Lang = "en" | "es" | "pt-BR";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português (Brasil)" },
];

const TABLES: Record<Lang, Translation> = {
  "en": en,
  "es": es,
  "pt-BR": ptBR,
};

export function isLang(value: string): value is Lang {
  return value === "en" || value === "es" || value === "pt-BR";
}

/** Best-effort detection from the environment (LANG / LC_ALL). Falls back to en. */
export function detectLang(): Lang {
  const raw = (process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || "").toLowerCase();
  if (raw.startsWith("pt")) return "pt-BR";
  if (raw.startsWith("es")) return "es";
  return "en";
}

export type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Build a translator bound to a language, with {var} interpolation and en fallback. */
export function makeT(lang: Lang): Translator {
  const table = TABLES[lang] ?? en;
  return (key, vars) => {
    let s = table[key] ?? en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

export type { TranslationKey };
