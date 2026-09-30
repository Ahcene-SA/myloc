#!/usr/bin/env bash
# Entrypoint du conteneur backend MYLOC.DZ :
# 1. génère le .env depuis les variables d'environnement ;
# 2. attend que MariaDB soit joignable ;
# 3. applique les migrations à chaque démarrage (idempotent) ;
# 4. au premier lancement seulement : flotte + compte admin ;
# 5. lance Apache au premier plan.
set -euo pipefail

cd /var/www/html

cat > .env <<EOF
APP_ENV=${APP_ENV:-production}
APP_TIMEZONE="${APP_TIMEZONE:-Africa/Algiers}"
DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-myloc_db}"
DB_USER="${DB_USER:-myloc}"
DB_PASS="${DB_PASS:-myloc_root}"
DB_CHARSET=utf8mb4
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRY="${JWT_EXPIRY:-86400}"
# Les origines sont séparées par des virgules, sans espaces : strictDotenv exige des valeurs sans espaces.
ALLOWED_ORIGINS="${ALLOWED_ORIGINS}"
RATE_LIMIT_MAX_ATTEMPTS="${RATE_LIMIT_MAX_ATTEMPTS:-5}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-900}"
MAIL_DRIVER="${MAIL_DRIVER:-log}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_SECURE="${SMTP_SECURE:-tls}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
MAIL_FROM="${MAIL_FROM:-contact@myloc.dz}"
MAIL_FROM_NAME="${MAIL_FROM_NAME:-MYLOC.DZ}"
AGENCY_NOTIFY_EMAIL="${AGENCY_NOTIFY_EMAIL:-}"
AGENCY_PHONE="${AGENCY_PHONE:-}"
CURRENCY="${CURRENCY:-DA}"
FRONTEND_URL="${FRONTEND_URL:-}"
PAGE_SUFFIX="${PAGE_SUFFIX:-.html}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@myloc.dz}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TRUST_PROXY=0
EOF
chown www-data:www-data .env && chmod 600 .env

echo "[entrypoint] Attente de MariaDB (${DB_HOST}:${DB_PORT})..."
php -r '
$tries = 60;
for ($i = 1; $i <= $tries; $i++) {
    try {
        new PDO(sprintf("mysql:host=%s;port=%s;charset=utf8mb4", getenv("DB_HOST"), getenv("DB_PORT")),
            getenv("DB_USER"), getenv("DB_PASS"), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        fwrite(STDERR, "[entrypoint] MariaDB OK.\n");
        exit(0);
    } catch (Throwable $e) {
        if ($i === $tries) { fwrite(STDERR, "[entrypoint] MariaDB injoignable : {$e->getMessage()}\n"); exit(1); }
        sleep(2);
    }
}'

echo "[entrypoint] Schéma de base (migrations.sql, idempotent)..."
MYSQL_PWD="${DB_PASS}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" < database/migrations.sql

echo "[entrypoint] Migrations..."
php database/migrate.php

if [ ! -f public/images/.myloc-seeded ]; then
    echo "[entrypoint] Premier lancement : flotte + admin..."
    php database/flotte.php || true
    if [ -n "${ADMIN_PASSWORD:-}" ]; then
        php database/seed.php
    else
        echo "[entrypoint] ADMIN_PASSWORD non défini : compte admin non créé."
    fi
    touch public/images/.myloc-seeded
else
    echo "[entrypoint] Déjà initialisé (marqueur présent), on saute flotte/admin."
fi

exec apache2-foreground