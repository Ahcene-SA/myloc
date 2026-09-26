#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# MYLOC.DZ — installation du backend en local sur Mac
# Usage (depuis le dossier myloc) :  bash myloc-backend/setup-mac.sh
# Ensuite, pour lancer l'API :       bash myloc-backend/start.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

say() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }

# 1. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew n'est pas installé. Installe-le d'abord :"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  exit 1
fi

# 2. PHP, Composer, MySQL
say "Installation de PHP, Composer et MySQL (peut prendre quelques minutes)"
for pkg in php composer mysql; do
  if brew list "$pkg" >/dev/null 2>&1; then ok "$pkg déjà installé"; else brew install "$pkg"; fi
done

say "Démarrage de MySQL"
brew services start mysql >/dev/null
for i in {1..20}; do mysqladmin ping --silent 2>/dev/null && break; sleep 1; done
ok "MySQL tourne"

# 3. Dépendances PHP
say "Installation des dépendances PHP (composer install)"
composer install --no-interaction --quiet
ok "Dépendances installées"

# 4. Fichier .env
if [ ! -f .env ]; then
  say "Création du fichier .env"
  read -r -p "Email du compte admin [admin@myloc.dz] : " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@myloc.dz}
  while true; do
    read -r -s -p "Mot de passe admin (8 caractères minimum) : " ADMIN_PASSWORD; echo
    if [ ${#ADMIN_PASSWORD} -lt 8 ]; then echo "Trop court, recommence."; continue; fi
    case "$ADMIN_PASSWORD" in *\'*) echo "Évite l'apostrophe ' dans le mot de passe."; continue;; esac
    break
  done
  DB_PASS=$(openssl rand -hex 12)
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=myloc_db
DB_USER=myloc
DB_PASS=${DB_PASS}
DB_CHARSET=utf8mb4

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=3600

RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_SECONDS=900
APP_ENV=development

ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD='${ADMIN_PASSWORD}'
EOF
  chmod 600 .env
  ok ".env créé (il n'est jamais envoyé sur GitHub)"
else
  ok ".env existe déjà, je le garde"
fi

env_get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
DB_NAME=$(env_get DB_NAME); DB_USER=$(env_get DB_USER); DB_PASS=$(env_get DB_PASS)

# 5. Base de données
say "Création de la base de données"
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
mysql -u root < database/migrations.sql
ok "Tables créées"

# 6. Admin + flotte de démo
say "Création du compte admin et de la flotte de démo"
php database/seed.php

# 7. Front : pointer vers l'API locale
if [ ! -f ../.env.development.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > ../.env.development.local
  ok "Front configuré pour utiliser l'API locale (.env.development.local)"
fi

say "Terminé ! Lance l'API avec :  bash myloc-backend/start.sh"
