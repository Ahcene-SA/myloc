#!/usr/bin/env bash
# MySQL dédié à MYLOC.DZ : MySQL 8.4 (version LTS stable), port 3307,
# données dans ~/.myloc-mysql84 (hors du Bureau). N'affecte pas tes autres MySQL.
# Usage : bash myloc-backend/mysql-local.sh start|stop|status
set -euo pipefail
cd "$(dirname "$0")"

BIN="$(brew --prefix mysql@8.4 2>/dev/null)/bin"
if [ ! -x "$BIN/mysqld" ]; then
  echo "MySQL 8.4 n'est pas installé. Lance : brew install mysql@8.4"; exit 1
fi
DATA="$HOME/.myloc-mysql84"
SOCK="$DATA/mysql.sock"
PORT=3307

running() { "$BIN/mysqladmin" --socket="$SOCK" -u root ping --silent >/dev/null 2>&1; }

case "${1:-start}" in
  start)
    if running; then echo "MySQL MYLOC déjà démarré (port $PORT)"; exit 0; fi
    if [ ! -d "$DATA/mysql" ]; then
      echo "Initialisation des données MySQL MYLOC…"
      mkdir -p "$DATA"
      "$BIN/mysqld" --no-defaults --initialize-insecure --datadir="$DATA" --log-error="$DATA/error.log"
    fi
    nohup "$BIN/mysqld" --no-defaults --datadir="$DATA" --port="$PORT" --bind-address=127.0.0.1 \
      --socket="$SOCK" --mysqlx=OFF --pid-file="$DATA/mysqld.pid" --log-error="$DATA/error.log" \
      >/dev/null 2>&1 &
    for i in {1..40}; do running && break; sleep 1; done
    if ! running; then
      echo "MySQL MYLOC ne démarre pas. Dernières lignes du journal :"
      tail -n 25 "$DATA/error.log" || true
      exit 1
    fi
    echo "MySQL MYLOC démarré (port $PORT)"
    ;;
  stop)
    if running; then "$BIN/mysqladmin" --socket="$SOCK" -u root shutdown; echo "MySQL MYLOC arrêté"; else echo "MySQL MYLOC n'était pas démarré"; fi
    ;;
  status)
    if running; then echo "MySQL MYLOC : démarré (port $PORT)"; else echo "MySQL MYLOC : arrêté"; fi
    ;;
  sql)
    shift; "$BIN/mysql" --socket="$SOCK" -u root "$@"
    ;;
  *) echo "Usage : $0 start|stop|status|sql"; exit 1 ;;
esac
