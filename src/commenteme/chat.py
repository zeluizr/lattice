"""Chat com o Claude dentro do dashboard (modelo barato/rápido: Haiku 4.5).

Credencial vem de um arquivo `.env` na raiz do projeto. Aceita:
  - API key do console:        ANTHROPIC_API_KEY=sk-ant-api03-...
  - token OAuth da assinatura: ANTHROPIC_API_KEY=sk-ant-oat01-...  (de `claude setup-token`)
    (também aceita ANTHROPIC_AUTH_TOKEN=...)

Tokens OAuth (prefixo sk-ant-oat) são enviados como Authorization: Bearer com o
header beta `oauth-2025-04-20`; keys normais vão como x-api-key.
"""

from __future__ import annotations

import os
from pathlib import Path

# raiz do projeto: src/commenteme/chat.py -> parents[2]
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _PROJECT_ROOT / ".env"

_SYSTEM = (
    "Você é um assistente integrado a um dashboard de terminal chamado commente.me, "
    "rodando num Mac (Apple Silicon). Responda em português, de forma curta e direta — "
    "são perguntas rápidas no terminal. Quando a pergunta for sobre o sistema, use o "
    "contexto ao vivo abaixo. Se algo não estiver no contexto, diga que não tem o dado."
)


def _load_env(path: Path) -> None:
    if not path.exists():
        return
    try:
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except OSError:
        pass


class ChatClient:
    def __init__(self, model: str = "claude-haiku-4-5"):
        self.model = model
        self.ready = False
        self.error: str | None = None
        self._client = None
        self._init()

    def _init(self) -> None:
        _load_env(_ENV_FILE)
        try:
            import anthropic
        except ImportError:
            self.error = "pacote 'anthropic' não instalado (pip install anthropic)"
            return

        cred = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
        if not cred:
            self.error = "sem credencial — crie um .env com ANTHROPIC_API_KEY=..."
            return

        try:
            if cred.startswith("sk-ant-oat"):  # token OAuth (claude setup-token)
                os.environ.pop("ANTHROPIC_API_KEY", None)  # evita enviar x-api-key junto
                os.environ["ANTHROPIC_AUTH_TOKEN"] = cred
                self._client = anthropic.Anthropic(
                    default_headers={"anthropic-beta": "oauth-2025-04-20"}
                )
            else:  # API key normal do console
                os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)
                self._client = anthropic.Anthropic(api_key=cred)
        except Exception as e:  # noqa: BLE001
            self.error = f"falha ao iniciar cliente: {e}"
            return
        self.ready = True

    def ask(self, question: str, context: str, history: list[dict]) -> str:
        """Chamada bloqueante (rode numa thread). Usa streaming para evitar timeouts."""
        system = f"{_SYSTEM}\n\n[contexto ao vivo do dashboard]\n{context}"
        messages = list(history) + [{"role": "user", "content": question}]
        with self._client.messages.stream(
            model=self.model,
            max_tokens=1024,
            system=system,
            messages=messages,
        ) as stream:
            msg = stream.get_final_message()
        return "".join(b.text for b in msg.content if b.type == "text").strip()
