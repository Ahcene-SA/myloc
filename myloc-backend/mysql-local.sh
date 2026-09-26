#!/usr/bin/env bash
# MySQL dédié à MYLOC.DZ (port 3307, données dans ~/.myloc-mysql)
# Usage : bash myloc-backend/mysql-local.sh start|stop|status
set -euo pipefail
cd "$(dirname "$0")"
DATA="$HOME/.myloc-mysql"   # hors du Bureau (iCloud / protections macOS)
SOCK="$DATA/mysql.sock"
PORT=3307

running() { mysqladmin --socket="$SOCK" -u root ping --silent >/dev/null 2>&1; }

case "${1:-start}" in
  start)
    if running; then echo "MySQL MYLOC déjà démarré (port $PORT)"; exit 0; fi
    if [ ! -d "$DATA/mysql" ]; then
      echo "Initialisation des données MySQL MYLOC…"
      mkdir -p "$DATA"
      mysqld --no-defaults --initialize-insecure --datadir="$DATA" --log-error="$DATA/error.log"
    fi
    mysqld --no-defaults --daemonize --datadir="$DATA" --port="$PORT" --bind-address=127.0.0.1 \
      --socket="$SOCK" --mysqlx=OFF --pid-file="$DATA/mysqld.pid" --log-error="$DATA/error.log" >/dev/null
    for i in {1..30}; do running && break; sleep 1; done
    if ! running; then
      echo "MySQL MYLOC ne démarre pas. Dernières lignes du journal :"
      tail -n 25 "$DATA/error.log" || true
      exit 1
    fi
    echo "MySQL MYLOC démarré (port $PORT)"
    ;;
  stop)
    if running; then mysqladmin --socket="$SOCK" -u root shutdown; echo "MySQL MYLOC arrêté"; else echo "MySQL MYLOC n'était pas démarré"; fi
    ;;
  status)
    if running; then echo "MySQL MYLOC : démarré (port $PORT)"; else echo "MySQL MYLOC : arrêté"; fi
    ;;
  *) echo "Usage : $0 start|stop|status"; exit 1 ;;
esac
