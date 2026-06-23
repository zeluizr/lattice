/**
 * Panel/metric icons with three modes: nerd (Nerd Font glyphs), emoji, none.
 *
 * The Nerd Font glyphs are from the Font Awesome 4 subset (U+F000–U+F2E0),
 * present in any Nerd Font patch (e.g. MesloLGS NF). Select a Nerd Font in your
 * terminal, or pass --icons emoji / --icons none.
 */

export type IconMode = "nerd" | "emoji" | "none";

export type IconName =
  | "cpu"
  | "gpu"
  | "mem"
  | "swap"
  | "net"
  | "disk"
  | "temp"
  | "fan"
  | "battery"
  | "power"
  | "tokens"
  | "vtex"
  | "chat"
  | "proc"
  | "clock";

const NERD: Record<IconName, string> = {
  cpu: "", // microchip
  gpu: "", // desktop
  mem: "", // database
  swap: "", // exchange
  net: "", // globe
  disk: "", // hdd
  temp: "", // fire
  fan: "", // rotate
  battery: "", // battery-full
  power: "", // bolt
  tokens: "", // money
  vtex: "", // shopping-cart
  chat: "", // comment
  proc: "", // tasks
  clock: "", // clock
};

const EMOJI: Record<IconName, string> = {
  cpu: "🖥️",
  gpu: "🎮",
  mem: "🧠",
  swap: "🔁",
  net: "🌐",
  disk: "💽",
  temp: "🌡️",
  fan: "🌀",
  battery: "🔋",
  power: "⚡",
  tokens: "🪙",
  vtex: "🛒",
  chat: "💬",
  proc: "📋",
  clock: "🕐",
};

export function isIconMode(mode: string): mode is IconMode {
  return mode === "nerd" || mode === "emoji" || mode === "none";
}

export function makeIcons(mode: IconMode): (name: IconName) => string {
  if (mode === "none") return () => "";
  const set = mode === "emoji" ? EMOJI : NERD;
  return (name: IconName) => set[name] ?? "";
}
