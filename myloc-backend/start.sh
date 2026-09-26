#!/usr/bin/env bash
# Lance MySQL (port 3307) + l'API MYLOC.DZ sur http://localhost:8000 (Ctrl + C pour arrêter l'API)
set -euo pipefail
cd "$(dirname "$0")"
bash ./mysql-local.sh start
echo "API MYLOC.DZ → http://localhost:8000/api/cars   (Ctrl + C pour arrêter)"
php -S localhost:8000 -t public public/index.php
