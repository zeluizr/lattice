# commente.me

Dashboard de **sistema, GPU, energia, custo de IA e VTEX em tempo real** direto no terminal — feito para **macOS Apple Silicon** (M1/M2/M3/M4). Interface TUI completa (Textual) com gráficos ao vivo (sparklines), tabela de processos e um **chat com o Claude** que enxerga as métricas da tela.

No Apple Silicon não existe `nvidia-smi`. Os dados vêm do próprio macOS e de logs locais:

| Painel | Fonte | Precisa de sudo? |
| --- | --- | --- |
| GPU: uso %, memória usada/alocada | `ioreg` (IOAccelerator) | ❌ não |
| CPU, RAM, swap, disco, rede, processos | `psutil` | ❌ não |
| Temperatura CPU/GPU + ventoinha (RPM) | SMC via IOKit (`ctypes`) | ❌ não |
| Bateria (%/saúde/ciclos/temp) | `psutil` + `ioreg` (AppleSmartBattery) | ❌ não |
| Energia (watts CPU/GPU/ANE), freq. GPU, pressão térmica | `powermetrics` | ✅ sim |
| IA · tokens/custo de hoje (Claude Code) | `~/.claude/projects/**/*.jsonl` | ❌ não |
| VTEX: conta, usuário, workspace | `~/.config/configstore/vtex.json` | ❌ não |
| Chat com o Claude | API Messages (`anthropic`) | precisa de credencial |

> **Temperatura e ventoinha** são lidas do SMC (IOKit) — funcionam **sem sudo**. Em desktops
> (Mac mini/Studio) o painel de bateria mostra "sem bateria"; num MacBook ele mostra
> %/saúde/ciclos/tempo restante automaticamente.

## Como rodar

```bash
# com watts (pede a senha do sudo no início)
./commente.me

# 100% sem sudo (sem watts; GPU%/memória continuam funcionando)
./commente.me --no-power
```

Na primeira execução o launcher cria um `.venv` e instala as dependências sozinho.

### Opções

```
--no-power        não usar powermetrics/sudo
--interval N      intervalo de atualização em segundos (padrão: 1.0)
--procs N         quantidade de processos no topo (padrão: 8)
```

### Teclas

- `q` sair · `p` pausar · `+` mais rápido · `-` mais lento
- Clique no campo de baixo (ou tecle no input) para perguntar ao Claude · `Enter` envia

## Tema (Dracula Pro) & fonte

O visual usa o tema **Dracula Pro** (cards com título na borda, cor de destaque por
painel, ícones Nerd Font). O terminal precisa de **truecolor** (Warp, iTerm2, Ghostty,
kitty têm) e, para os ícones, de uma **Nerd Font**.

**Fonte (ícones):** o app não controla a fonte — o terminal controla. No Warp:
*Settings → Appearance → Text → Font → `MesloLGS NF`* (ou outra Nerd Font). Sem Nerd
Font, rode com emoji ou sem ícones:

```bash
./commente.me --icons emoji   # 🖥️ 🎮 🔋 … (qualquer fonte)
./commente.me --icons none    # só texto
```

**Cores Dracula Pro:** o tema já vem com os hex oficiais do **Dracula Pro**. Para trocar
a variante, edite uma linha em `src/commenteme/theme.py`:

```python
VARIANT = "pro"   # pro · blade · buffy · lincoln · morbius · van-helsing
```

Os accents (cyan, green, orange, pink, purple, red, yellow + foreground) são iguais em
todas as variantes; só Background/Comment/Selection mudam.

## Painel de IA (tokens/custo de hoje)

Lê os logs locais do Claude Code (`~/.claude/projects/**/*.jsonl`) e soma os tokens do dia
(input/output/cache) por modelo, calculando o custo com a tabela oficial da Anthropic
(Opus 4.8 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5 por 1M; cache-write 1.25×, cache-read 0.1×).
Tudo local, sem rede.

## Painel VTEX

Lê a sessão salva da VTEX CLI (o mesmo arquivo que o `vtex whoami` usa) — sem rodar a CLI
(que é interativa). Mostra conta/usuário/workspace quando logado, ou "não logado". Acende
sozinho assim que você roda `vtex login <conta>`.

## Chat com o Claude (Haiku 4.5)

O campo na base da tela manda sua pergunta para o Claude **com o snapshot ao vivo** do
dashboard injetado (CPU, GPU, RAM, rede, disco, energia, tokens, VTEX) — então dá para
perguntar "por que a GPU subiu?" e ele vê os números.

### Configurar a credencial

Crie um arquivo `.env` na raiz do projeto (veja `.env.example`):

```bash
cp .env.example .env
# edite e cole sua API key:
# ANTHROPIC_API_KEY=sk-ant-api03-...
```

> ⚠️ **Sobre o plano Pro/Max e `claude setup-token`:** a Messages API **recusa tokens OAuth**
> hoje ("OAuth authentication is currently not supported"). O `claude setup-token` serve para o
> Claude Code, não para apps próprios. Para o chat funcionar use uma **API key do console**
> (https://console.anthropic.com → API Keys). Com Haiku 4.5 cada pergunta custa frações de centavo.
> O código já aceita um token `sk-ant-oat...` para o dia em que a Anthropic habilitar OAuth na API.

## Watts sem digitar senha (opcional)

```bash
sudo bash scripts/setup-sudoers.sh
```

Libera só o `powermetrics` via sudo sem senha. Depois é só `./commente.me`.

## Instalar como comando global (opcional)

```bash
pipx install .       # ou: pip install .
commenteme           # mesmo app, instalado no PATH
```

## Estrutura

```
src/commenteme/
├── cli.py                 # parsing de args (+ --icons) + pré-autenticação do sudo
├── app.py                 # TUI (Textual): layout, tema, loops, chat, teclas
├── theme.py               # tema Dracula Pro (PALETTE → cole seus hex aqui)
├── icons.py               # ícones nerd/emoji/none
├── widgets.py             # cards (GraphPanel com sparkline, TextPanel)
├── chat.py                # cliente do Claude (lê .env, Haiku 4.5, contexto ao vivo)
└── collectors/
    ├── system.py          # psutil → CPU/RAM/disco/rede/processos (com taxas)
    ├── gpu.py             # ioreg → uso% e memória da GPU (sem sudo)
    ├── sensors.py         # SMC/IOKit → temp CPU/GPU + ventoinha; bateria (sem sudo)
    ├── power.py           # powermetrics streaming → watts/freq/pressão (sudo)
    ├── tokens.py          # logs do Claude Code → tokens e custo de hoje
    └── vtex.py            # sessão da VTEX CLI → conta/usuário/workspace
```
