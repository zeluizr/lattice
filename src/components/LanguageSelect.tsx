import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { LANGS, type Lang } from "../i18n/index.js";
import type { Palette } from "../theme.js";

/** First-run language picker. Trilingual prompt so it reads for everyone. */
export function LanguageSelect({
  pal,
  onSelect,
}: {
  pal: Palette;
  onSelect: (lang: Lang) => void;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") setIndex((i) => (i - 1 + LANGS.length) % LANGS.length);
    else if (key.downArrow || input === "j") setIndex((i) => (i + 1) % LANGS.length);
    else if (key.return) onSelect(LANGS[index].code);
    else {
      const n = Number(input);
      if (n >= 1 && n <= LANGS.length) onSelect(LANGS[n - 1].code);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={pal.purple} paddingX={2} paddingY={1}>
      <Text color={pal.purple} bold>
        lattice
      </Text>
      <Text color={pal.comment}>Choose your language · Elige tu idioma · Escolha seu idioma</Text>
      <Box marginTop={1} flexDirection="column">
        {LANGS.map((l, i) => {
          const active = i === index;
          return (
            <Text key={l.code} color={active ? pal.cyan : pal.foreground}>
              {active ? "❯ " : "  "}
              {i + 1}. {l.label}
            </Text>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color={pal.comment}>↑/↓ move · Enter select · 1–3 quick pick</Text>
      </Box>
    </Box>
  );
}
