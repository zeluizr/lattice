# Landing page prompt

Copy everything in the block below into a website generator (v0, Claude, Lovable,
Bolt, etc.) to build the lattice landing page. It's self-contained: it includes
the copy, the exact color palette, the three languages and the manifesto.

---

````text
Build a single-page, responsive marketing website for "lattice" — an open-source,
real-time terminal dashboard (TUI) for macOS Apple Silicon. It shows GPU, power,
temperatures/fans, per-disk I/O & usage (including external volumes under
`/Volumes`), network, system metrics and AI token cost. It is a focused,
local-only monitor — nothing ever leaves your Mac. It installs from npm and runs
with `npx @zeluizr/lattice` or `npm i -g @zeluizr/lattice` (command: `lattice`).
Repo: https://github.com/zeluizr/lattice — npm: @zeluizr/lattice — License: MIT.

TECH & QUALITY
- One page, fully responsive, no backend. Plain static HTML/CSS/JS is fine
  (React + Vite also fine). Fast, accessible (semantic HTML, good contrast in
  both themes, keyboard-navigable controls), no tracking.
- Aesthetic: terminal/developer vibe. Monospace for headings, code and the logo
  mark "◇ lattice". A subtle silicon-lattice / dot-grid background, faint and
  tasteful (not a gimmick). Rounded "card" panels echoing the app's bordered
  boxes.

THEMES — a toggle in the header, default Dark, persisted in localStorage:
- DARK (Dracula Pro):
  background #22212C, surface #454158, border/muted #7970A9, text #F8F8F2,
  cyan #80FFEA, green #8AFF80, orange #FFCA80, pink #FF80BF, purple #9580FF,
  red #FF9580, yellow #FFFF80.
  Primary = purple #9580FF, accent = pink #FF80BF.
- LIGHT (same accents on a light base):
  background #F8F8F2, surface #FFFFFF, text #22212C, muted #7970A9, border #DAD8E6.
  Keep purple #9580FF primary and pink #FF80BF accent; accents stay identical so
  the brand reads the same in both themes.

LANGUAGES — a switcher (EN · ES · PT-BR) in the header, persisted in
localStorage, defaulting to the browser language and falling back to English.
Provide ALL copy in the three languages. These mirror the app's own locales.

SECTIONS
1. Header: logo "◇ lattice", language switcher, theme toggle, GitHub + npm links.
2. Hero: tagline "Watch your machine think." A one-line pitch:
   "A real-time terminal dashboard for macOS Apple Silicon — GPU, power, temps &
   fans, per-disk I/O, network, system metrics and AI token cost. Local-only,
   nothing leaves your Mac."
   Primary CTA: a copy-to-clipboard code chip `npx @zeluizr/lattice`.
   Secondary CTA: "View on GitHub".
3. Faux terminal demo: a styled, looping mock of the dashboard — bordered panels
   for CPU / MEMORY / GPU with little block sparklines (▁▂▃▄▅▆▇█), a
   TEMPERATURE panel (e.g. "48° / 41°  ● normal"), and an "AI · TOKENS TODAY"
   panel (e.g. "$2.41 · 312 messages"). Pure CSS/JS animation, no real data.
4. Features grid (icon + title + one line each):
   - Apple Silicon native (IOKit / SMC / ioreg / powermetrics)
   - GPU usage & memory
   - Power (watts), temps & fans — temps without sudo
   - AI cost tracking from your Claude Code logs (today's spend)
   - Per-disk I/O & usage — one row per mount, including /Volumes
   - Git branches — current branch + dirty/ahead·behind for the repos in a folder
   - Six Dracula Pro themes
   - Three languages (EN / ES / PT-BR)
   - Local-first: no telemetry, no accounts, no cloud
5. Commands & usage:
   - Install: `npx @zeluizr/lattice` and `npm i -g @zeluizr/lattice`
   - Flags: --no-power, --no-vtex, --repos <dir>, --interval, --procs,
     --icons (nerd|emoji|none), --lang (en|es|pt-BR), --theme
   - Hotkeys: q quit · p pause · +/- speed
6. Per-disk visibility: short explainer that storage isn't one number — lattice
   shows each mount on its own (`/` and every external volume under `/Volumes`)
   with live read/write throughput and space used, so you see exactly which disk
   is busy. Show a small mock disks table with two or three rows.
7. Manifesto: render the 7 points below as a styled section.
8. Footer: MIT license, GitHub, npm, "Made for Apple Silicon", author
   Jose Luiz Rodrigues.

MANIFESTO (English — translate to ES and PT-BR for the other languages, keeping
the tone):
  Title: The lattice manifesto
  Intro: "Every machine hums with signals — cores spiking, watts flowing, silicon
  warming and cooling in a rhythm you rarely see. lattice makes that rhythm
  visible."
  1. Your machine, your data. Every metric is read locally and stays local. No
     telemetry, no accounts, no cloud — nothing ever leaves your Mac.
  2. Built for the metal it runs on. lattice speaks IOKit, SMC, ioreg and
     powermetrics natively — tuned for Apple Silicon, from the M1 to whatever
     comes next.
  3. The terminal deserves beauty. Real colors, live sparklines, considered
     typography. Function and form are not opposites.
  4. Every disk, every volume. Storage isn't one number. lattice shows each disk
     on its own — `/` and every external volume under `/Volumes` — with live
     read/write and space used, so you see exactly which one is working.
  5. Fast, small, out of the way. A monitor that hogs the resources it measures
     has failed.
  6. Open and yours to bend. MIT-licensed, readable, hackable.
  7. In your language. English, Español, Português — because good tools shouldn't
     assume where you're from.
  Closing: "lattice is the ordered structure beneath the chip, made legible.
  Watch your machine think."

Deliver clean, well-commented code with the dark theme as default and a working
language + theme switch.
````
