#!/usr/bin/env bash
# Lance l'API MYLOC.DZ sur http://localhost:8000 (Ctrl + C pour arrêter)
set -euo pipefail
cd "$(dirname "$0")"
brew services start mysql >/dev/null 2>&1 || true
echo "API MYLOC.DZ → http://localhost:8000/api/cars   (Ctrl + C pour arrêter)"
php -S localhost:8000 -t public public/index.php
