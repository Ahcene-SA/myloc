#!/usr/bin/env bash
# Entrypoint du conteneur backend MYLOC.DZ :
# 1. génère le .env depuis les variables d'environnement ;
# 2. attend que MariaDB soit joignable ;
# 3. applique les migrations à chaque démarrage (idempotent) ;
# 4. au premier lancement seulement : flotte + compte admin ;
# 5. lance Apache au premier plan.
set -euo pipefail

cd /var/www/html

# Écrit « CLÉ="valeur" » dans le .env. printf fait l'insertion de la valeur telle quelle :
# contrairement au heredoc, un secret contenant $, un antislash ou un backtick n'est
# jamais interpolé ni déformé.
env_kv() { printf '%s="%s"\n' "$1" "$2" >> .env; }

: > .env
printf '# Configuration generee a chaque demarrage depuis l environnement — ne pas editer.\n' >> .env
env_kv APP_ENV "${APP_ENV:-production}"
env_kv APP_TIMEZONE "${APP_TIMEZONE:-Africa/Algiers}"
env_kv DB_HOST "${DB_HOST:-mariadb}"
env_kv DB_PORT "${DB_PORT:-3306}"
env_kv DB_NAME "${DB_NAME:-myloc_db}"
env_kv DB_USER "${DB_USER:-myloc}"
# Requis : compose refuse déjà de démarrer sans ces deux variables (pas de mot de passe
# ni de secret « de secours » connu de tout le dépôt).
env_kv DB_PASS "${DB_PASS:?DB_PASS requis — onglet Environment Dokploy}"
env_kv DB_CHARSET utf8mb4
env_kv JWT_SECRET "${JWT_SECRET:?JWT_SECRET requis — chaîne aléatoire de 32+ caractères}"
env_kv JWT_EXPIRY "${JWT_EXPIRY:-86400}"
# Les origines sont séparées par des virgules, sans espaces : strictDotenv exige des valeurs sans espaces.
env_kv ALLOWED_ORIGINS "${ALLOWED_ORIGINS:-}"
env_kv RATE_LIMIT_MAX_ATTEMPTS "${RATE_LIMIT_MAX_ATTEMPTS:-5}"
env_kv RATE_LIMIT_WINDOW_SECONDS "${RATE_LIMIT_WINDOW_SECONDS:-900}"
env_kv MAIL_DRIVER "${MAIL_DRIVER:-log}"
env_kv SMTP_HOST "${SMTP_HOST:-}"
env_kv SMTP_PORT "${SMTP_PORT:-587}"
env_kv SMTP_SECURE "${SMTP_SECURE:-tls}"
env_kv SMTP_USER "${SMTP_USER:-}"
env_kv SMTP_PASS "${SMTP_PASS:-}"
env_kv MAIL_FROM "${MAIL_FROM:-contact@myloc.dz}"
env_kv MAIL_FROM_NAME "${MAIL_FROM_NAME:-MYLOC.DZ}"
env_kv AGENCY_NOTIFY_EMAIL "${AGENCY_NOTIFY_EMAIL:-}"
env_kv AGENCY_PHONE "${AGENCY_PHONE:-}"
env_kv WHATSAPP_DRIVER "${WHATSAPP_DRIVER:-log}"
env_kv WHATSAPP_TO "${WHATSAPP_TO:-}"
env_kv WHATSAPP_TOKEN "${WHATSAPP_TOKEN:-}"
env_kv WHATSAPP_PHONE_ID "${WHATSAPP_PHONE_ID:-}"
env_kv WHATSAPP_TEMPLATE "${WHATSAPP_TEMPLATE:-reservation}"
env_kv WHATSAPP_LANG "${WHATSAPP_LANG:-fr}"
env_kv WHATSAPP_APIKEY "${WHATSAPP_APIKEY:-}"
env_kv CURRENCY "${CURRENCY:-DA}"
env_kv FRONTEND_URL "${FRONTEND_URL:-}"
env_kv PAGE_SUFFIX "${PAGE_SUFFIX:-.html}"
env_kv ADMIN_EMAIL "${ADMIN_EMAIL:-admin@myloc.dz}"
env_kv ADMIN_PASSWORD "${ADMIN_PASSWORD:-}"
# L'API vit toujours derrière notre Nginx frontal (même réseau compose, non joignable du
# public) : l'IP visiteur est lue dans X-Forwarded-For — une seule valeur, réécrite par
# Nginx à partir de sa connexion réelle (voir nginx-frontend.conf).
env_kv TRUST_PROXY 1
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