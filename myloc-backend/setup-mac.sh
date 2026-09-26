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
for pkg in php composer; do
  if brew list "$pkg" >/dev/null 2>&1; then ok "$pkg déjà installé"; else brew install "$pkg"; fi
done

say "Vérification de MySQL (celui déjà installé sur ton Mac, port 3306)"
if ! mysqladmin ping --silent 2>/dev/null; then
  echo "Aucun MySQL ne répond. Démarre celui de tes autres projets, puis relance ce script."
  exit 1
fi
ok "MySQL répond"

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
    IFS= read -r -s -p "Mot de passe admin (8 caractères minimum) : " ADMIN_PASSWORD; echo
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
  sed -i '' -e 's/^DB_HOST=.*/DB_HOST=127.0.0.1/' -e 's/^DB_PORT=.*/DB_PORT=3306/' .env
  ok ".env existe déjà, je le garde (MySQL port 3306)"
fi

env_get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
DB_NAME=$(env_get DB_NAME); DB_USER=$(env_get DB_USER); DB_PASS=$(env_get DB_PASS)

# 5. Base de données
say "Création de la base de données"
# Accès root : sans mot de passe, ou avec celui de ton MySQL (les espaces comptent !).
if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
  :
else
  for attempt in 1 2 3; do
    IFS= read -r -s -p "Mot de passe ROOT de MySQL : " MYSQL_ROOT_PW; echo
    if MYSQL_PWD="$MYSQL_ROOT_PW" mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
      export MYSQL_PWD="$MYSQL_ROOT_PW"; break
    fi
    echo "Refusé, réessaie."
    [ "$attempt" = 3 ] && { echo "Impossible de se connecter à MySQL en root."; exit 1; }
  done
fi
ok "Connecté à MySQL"
SQL_ROOT=(mysql -u root)
"${SQL_ROOT[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
"${SQL_ROOT[@]}" < database/migrations.sql
# Mises à jour d'une base déjà existante (sans risque si déjà appliquées)
"${SQL_ROOT[@]}" "${DB_NAME}" < database/migrations/003_add_compacte_category.sql
"${SQL_ROOT[@]}" "${DB_NAME}" < database/migrations/004_demo_fleet_new_images.sql
ok "Tables créées / mises à jour"

# 6. Admin + flotte de démo
say "Création du compte admin et de la flotte de démo"
unset MYSQL_PWD
php database/seed.php

# 7. Front : pointer vers l'API locale
if [ ! -f ../.env.development.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > ../.env.development.local
  ok "Front configuré pour utiliser l'API locale (.env.development.local)"
fi

say "Terminé ! Lance l'API avec :  bash myloc-backend/start.sh"
