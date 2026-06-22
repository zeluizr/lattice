"""Entrada de linha de comando do commente.me."""

from __future__ import annotations

import argparse
import subprocess
import sys


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="commenteme",
        description="commente.me — dashboard de sistema, GPU e energia em tempo real (Apple Silicon)",
    )
    parser.add_argument(
        "--no-power",
        action="store_true",
        help="nao usar powermetrics/sudo (mostra uso da GPU, memoria, CPU, RAM, disco e rede)",
    )
    parser.add_argument("--interval", type=float, default=1.0, help="intervalo de atualização (s)")
    parser.add_argument("--procs", type=int, default=8, help="quantidade de processos no topo")
    parser.add_argument(
        "--icons",
        choices=["nerd", "emoji", "none"],
        default="nerd",
        help="estilo de ícones (nerd precisa de Nerd Font no terminal)",
    )
    args = parser.parse_args(argv)

    from .icons import set_mode

    set_mode(args.icons)

    use_power = not args.no_power
    if use_power:
        # Pré-autentica o sudo ANTES da TUI tomar o terminal, para que o
        # subprocesso `sudo powermetrics` não precise pedir senha no meio da tela.
        print("commente.me precisa de sudo para ler energia (powermetrics).")
        print("Dica: use --no-power para rodar sem senha.\n")
        try:
            subprocess.run(["sudo", "-v"], check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("sudo indisponível — seguindo sem dados de energia.", file=sys.stderr)
            use_power = False
        except KeyboardInterrupt:
            return 130

    from .app import DashboardApp

    app = DashboardApp(interval=args.interval, top_n=args.procs, use_power=use_power)
    app.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
