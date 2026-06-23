#!/usr/bin/env bash
# (Optional) Allow `powermetrics` via sudo WITHOUT a password, so lattice can
# show watts without you typing your password every time.
#
# Creates /etc/sudoers.d/lattice-powermetrics. Run with:
#   sudo bash scripts/setup-sudoers.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash scripts/setup-sudoers.sh" >&2
  exit 1
fi

USER_NAME="${SUDO_USER:-$(whoami)}"
PM="$(command -v powermetrics || echo /usr/bin/powermetrics)"
FILE="/etc/sudoers.d/lattice-powermetrics"

echo "${USER_NAME} ALL=(root) NOPASSWD: ${PM}" > "$FILE"
chmod 0440 "$FILE"

# validate syntax; if invalid, remove so it can't break sudo
if visudo -cf "$FILE" >/dev/null; then
  echo "OK: ${USER_NAME} can run ${PM} without a password."
  echo "Now run:  lattice"
else
  rm -f "$FILE"
  echo "Invalid syntax — file removed." >&2
  exit 1
fi
