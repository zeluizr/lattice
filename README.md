# ◇ lattice

**Dashboard de terminal en tiempo real para macOS Apple Silicon.**

GPU · temperaturas y ventiladores · I/O por disco (incl. `/Volumes`) · red · memoria ·
procesos · costo de tokens de IA · estado de git y VTEX. Un monitor enfocado: cada métrica
se lee localmente, nada sale de tu Mac.

[![npm](https://badgen.net/npm/v/@zeluizr/lattice?color=9580FF)](https://www.npmjs.com/package/@zeluizr/lattice)
[![node](https://badgen.net/npm/node/@zeluizr/lattice?color=9580FF)](https://nodejs.org)
[![licencia](https://badgen.net/npm/license/@zeluizr/lattice?label=licencia&color=9580FF)](./LICENSE)

---

## Instalación

Instálalo de forma global y córrelo con `lattice`:

```bash
npm i -g @zeluizr/lattice
lattice
```

O ejecútalo al vuelo, sin instalar:

```bash
npx @zeluizr/lattice
```

## Uso

```bash
lattice
```

No tiene flags y **no necesita sudo**: corre el dashboard completo. En el primer arranque te
pregunta el idioma (English · Español · Português) y lo recuerda. El resto —tema, íconos,
lista de repos de git, contenedor zgit— vive en `~/.config/lattice/config.json`.

### Atajos

| Tecla | Acción |
|:-----:|--------|
| `q` | salir |
| `p` | pausar / reanudar |
| `+` / `-` | refrescar más rápido / más lento |

## Qué muestra

| Panel | Fuente |
|-------|--------|
| GPU — uso y memoria | `ioreg` (IOAccelerator) |
| CPU, RAM, swap, red, procesos | APIs del sistema |
| I/O y uso por disco — `/` y cada `/Volumes/*` | `ioreg` + APIs del sistema |
| Temperaturas y ventiladores | SMC vía IOKit (sin sudo) |
| Tokens y costo de IA (hoy) | logs de Claude Code (`~/.claude`) |
| Git — rama, dirty y ahead/behind por repo | `git status` |
| Estado de VTEX | configstore de la CLI de VTEX |

## Requisitos

- **macOS en Apple Silicon** (M1/M2/M3/M4…). No corre en Intel ni en otros sistemas.
- **Node.js ≥ 18.**
- Una terminal truecolor; opcionalmente una Nerd Font para los íconos.

---

lattice es **open source** bajo licencia [MIT](./LICENSE).

_Hecho con amor y café por [zeluizr](https://github.com/zeluizr) y con la ayuda de [Claude](https://claude.ai/referral/Cz_UimA0NQ) ☕_
