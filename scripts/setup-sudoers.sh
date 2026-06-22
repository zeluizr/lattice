#!/usr/bin/env bash
# (Opcional) Libera `powermetrics` via sudo SEM pedir senha, para que o
# commente.me mostre watts sem você digitar a senha toda vez.
#
# Cria /etc/sudoers.d/commenteme-powermetrics. Rode com:  sudo bash scripts/setup-sudoers.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash scripts/setup-sudoers.sh" >&2
  exit 1
fi

USER_NAME="${SUDO_USER:-$(whoami)}"
PM="$(command -v powermetrics || echo /usr/bin/powermetrics)"
FILE="/etc/sudoers.d/commenteme-powermetrics"

echo "${USER_NAME} ALL=(root) NOPASSWD: ${PM}" > "$FILE"
chmod 0440 "$FILE"

# valida a sintaxe; se inválida, remove para não travar o sudo
if visudo -cf "$FILE" >/dev/null; then
  echo "OK: ${USER_NAME} pode rodar ${PM} sem senha."
  echo "Agora rode:  ./commente.me"
else
  rm -f "$FILE"
  echo "Sintaxe inválida — arquivo removido." >&2
  exit 1
fi
