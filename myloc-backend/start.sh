#!/usr/bin/env bash
# Lance l'API MYLOC.DZ sur http://localhost:8000 (Ctrl + C pour arrêter)
# MySQL : celui déjà installé sur ton Mac (port 3306).
set -euo pipefail
cd "$(dirname "$0")"
if ! mysqladmin ping --silent 2>/dev/null; then
  echo "MySQL ne répond pas : démarre-le (comme pour tes autres projets) puis relance."; exit 1
fi
echo "API MYLOC.DZ → http://localhost:8000/api/cars   (Ctrl + C pour arrêter)"
php -S 127.0.0.1:8000 -t public public/index.php
