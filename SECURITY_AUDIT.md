# SECURITY_AUDIT.md — MYLOC.DZ

Audit défensif (développeur du projet, autorisé) — réalisé le 2026-10-01.

**Périmètre** : API PHP 8.3 (`myloc-backend/`, 33 routes), frontend Next.js 16 export statique
(servi par Nginx), configuration Docker (`deploy/`), historique git, dépendances.

**Méthode** : lecture intégrale des fichiers d'entrée, de tous les contrôleurs/modèles/services,
de la conf serveur ; vérification empirique sous `php:8.3-apache` réel et `php -S` ;
sweep des secrets dans tout le dépôt + `git log --all`. Chaque signalement a été vérifié
ligne à ligne avant correction.

## Architecture (résumé)

- Frontend : Next.js 16 export statique (`dist/`), Nginx (conteneur) sert les `.html` et
  proxifie `/api/` vers le backend — un seul domaine, pas de CORS côté navigateur.
- Backend : PHP 8.3 + Apache (DocumentRoot `public/`, `.htaccess` rewrite vers `index.php`),
  PDO/MariaDB, auth JWT HS256 (clients) + JWT agence avec TOTP obligatoire côté propriétaire.
- Déploiement : Dokploy = `deploy/compose.yaml` (mariadb + backend + frontend) sur le réseau
  externe `dokploy-network` derrière Traefik (TLS).

## Table

Triée par sévérité. « Statut » : corrigé sur la branche `security-hardening`, ou acceptance
documentée. Les IDs citent aussi l'agent d'origine (A = auth, D = données, C = config/infra).

| ID | Sévérité | Fichier (ligne) | Description | Scénario d'exploit | Statut |
|----|----------|-----------------|-------------|--------------------|--------|
| S1 | **High** | `deploy/compose.yaml:48`, `myloc-backend/.env.example:14` | Fallback `JWT_SECRET: ${JWT_SECRET:-change_me…}` publié dans le dépôt ; `JwtHelper.php:21` ne rejette que la chaîne **vide**, un secret par défaut passe sans erreur | Un tiers connaissant le dépôt forge un JWT `role: owner` valable et obtient l'espace agence complet | ✅ Corrigé : `${JWT_SECRET:?requis}` (déploiement échoue sans variable) |
| S2 | **High** | `deploy/compose.yaml:18,21,47`, `backend-entrypoint.sh:19` | Mot de passe MariaDB par défaut `myloc_root` (publié) ; MariaDB n'expose pas de port mais vit sur `dokploy-network`, partagé avec les autres services de la VPS | Tout conteneur voisin sur le réseau partagé se connecte en `root/myloc_root` | ✅ Corrigé : `${DB_PASS:?requis}` ; **rotation du mot de passe recommandée avant fusion** (voir checklist §5) |
| S3 | Medium | `src/Router.php:73-74`, `AuthMiddleware.php:218-222`, `AuthController.php:207`, `public/index.php:84` | `'admin'` = `requireStaff()` : un `employee` accède à l'annuaire clients complet (emails, téléphones, dépenses) via `/api/auth/clients` | Connexion `employee` → `GET /api/auth/clients` → extraction du fichier clients | ✅ Corrigé : annuaire clients réservé au `owner` (route + handler). Les autres routes « admin » (voitures, réservations, contrôles documentaires) restent ouvertes à l'équipe — **choix métier à confirmer par le propriétaire** (S27) |
| S4 | Medium | `src/Controllers/AgencyController.php:83-94, 222-237` | 2FA exigée uniquement du `owner` : les employés se connectent avec le seul mot de passe, et peuvent retirer leur propre 2FA | Phishing du mot de passe d'un employé → accès direct au back-office sans second facteur | ✅ Corrigé : inscription 2FA imposée à **tout** le staff à la première connexion ; la désactivation par soi-même est fermée (passage par « Réinitialiser la 2FA » du propriétaire) |
| S5 | Medium | `deploy/nginx-frontend.conf` | Aucun en-tête de sécurité globalement (un `nosniff` local, non hérité) : pas de CSP, frame-ancestors, HSTS, Referrer-Policy, Permissions-Policy | Script tiers injecté → vol immédiat du JWT (stocké en `localStorage`, S10) ; `/agence` cliquable en iframe | ✅ Corrigé : bloc d'en-têtes (`include`) CSP, `frame-ancestors 'none'`, HSTS, etc. |
| S6 | Medium | `backend-entrypoint.sh:49` (TRUST_PROXY=0), `nginx-frontend.conf:19`, `src/Utils/ClientIp.php:19-33` | Derrière Nginx, tous les visiteurs partagent l'IP du conteneur Nginx → les limiteurs « par IP » deviennent un **compteur global** ; en plus, XFF lu à la première entrée (falsifiable) | 5 mauvais mots de passe (n'importe qui) → **tous** les logins bloqués 15 min site entier | ✅ Corrigé : XFF transmis par Nginx, `TRUST_PROXY=1` au déploiement, `ClientIp` lit l'entrée la plus à droite (ajoutée par la chaîne de confiance) |
| S7 | Medium | `src/Controllers/AuthController.php:61-62` (route `index.php:75`) | `register` sans limiteur d'IP : sondage d'emails possédant un compte (409 distinct) + inscription en masse | Script → annuaire des emails clients enregistrés + faux comptes dans la liste de l'agence | ✅ Corrigé : limiteur par IP (10 inscriptions/h). Le 409 distinct est **accepté** (UX du formulaire) et désormais borné |
| S8 | Medium | `src/Controllers/PricingController.php:30-52` (route `index.php:117`), `src/Services/Pricing.php:173-187` | `/api/pricing/quote` public sans limiteur : messages distincts révélant l'état de chaque code promo (inexistant / à venir / expiré / épuisé) + pas de plafond côté réservation | Brute force de codes promo à vitesse HTTP par un visiteur sans compte | ✅ Corrigé : limiteur par IP (20 essais de code/10 min) + messages d'échec unifiés (« Code promo invalide ou non applicable ») |
| S9 | Medium | `src/Controllers/ReservationController.php:24,107-141` | Seule limite : 3 demandes en attente **par compte** ; rien par IP (et `register` est public) → comptes jetables par bot | Bot : N comptes → la flotte entière bloquée 90 jours + inondation d'alertes email/WhatsApp | ✅ Corrigé : plafond par IP (10 réservations créées/jour/IP) en plus du plafond par compte |
| S10 | Medium | `lib/api.ts:131` (`myloc_token`), `components/AuthContext.tsx` | JWT (24 h, tous rôles) en `localStorage` : lisible par tout XSS ; pas de CSRF possible (auth 100 % Bearer, aucun cookie) — surface réelle = XSS uniquement | XSS (bloqué par la CSP de S5) → lecture du jeton → impersonation jusqu'à expiration | ⚠️ Accepté (refonte cookies hors périmètre « pas de réécriture ») ; atténué par S5 (CSP stricte), S3 (2FA staff) et le nouveau logout client (S20) |
| S11 | Medium | `deploy/Dockerfile.frontend:7` | `npm install` ignore le lockfile (plages de versions résolues au build) → dérive de dépendances, exécution de postinstall non audités | Publication compromise d'une dépendance transitive adoptée silencieusement au re-déploiement | ✅ Corrigé : lockfile régénéré sous Linux (optionnelles manquantes `@emnapi/*`) + retour à `npm ci` |
| S12 | Low | `src/Middleware/CorsMiddleware.php:12` | `Access-Control-Allow-Origin: *` inconditionnel ; `ALLOWED_ORIGINS` documenté mais mort ; tout site peut piloter l'API depuis le navigateur d'une victime | Page malveillante interroge l'API depuis l'IP de la victime (contournement de blocage IP) | ✅ Corrigé : liste `ALLOWED_ORIGINS` réellement appliquée (écho de l'origine correspondante + `Vary: Origin`) ; `*` seulement si la liste est vide |
| S13 | Low | `deploy/Dockerfile.backend` | Aucun `php.ini` : `X-Powered-By: PHP/8.3.x` exposé ; une erreur fatale **avant** le garde d'`index.php:38` affiche les chemins du serveur | Empreinte technique + fuite de chemins au debug | ✅ Corrigé : `zz-myloc.ini` (display_errors=Off, expose_php=Off, log_errors=On) dans l'image |
| S14 | Low | `lib/api.ts:17-19` | Surcharge runtime `window.MYLOC_API_URL` active en production (le hook localStorage voisin est, lui, déjà bloqué en prod) | Primitif idéal pour un script injecté : détourner l'API (et le jeton) vers un serveur tiers | ✅ Corrigé : surcharge limitée au développement, comme l'autre |
| S15 | Low | `components/agency/AgencyLogin.tsx:360-366` | `document.write` avec littéral interpolé (codes de secours, générés serveur) — seul vrai point d'injection HTML du frontend | Sink inerte aujourd'hui ; durci par principe | ✅ Corrigé : popup construit par `createElement`/`textContent` |
| S16 | Low | `deploy/compose.yaml:91-92` | `ports: - 80` publie HTTP en clair sur un port hôte aléatoire, contournant Traefik/TLS et le pare-feu usuel | Site accessible en HTTP non chiffré sur `IP:port` aléatoire | ✅ Corrigé : publication retirée (Traefik sur le réseau dédié suffit) ; les tests locaux utilisent `compose.override.yaml` |
| S17 | Low | `deploy/backend-entrypoint.sh:12-50` | Génération du `.env` par heredoc : les valeurs contenant `$`, backtick ou saut de ligne se déforment silencieusement | Un `JWT_SECRET` avec `$` ne serait pas le secret prévu (robustesse) | ✅ Corrigé : écritures `printf '%s'` par clé, valeurs protégées |
| S18 | Low | `src/Utils/Mailer.php:64-67` | `$to`/`$subject` bruts écrits dans le commentaire HTML des fichiers `logs/mails/` (hors web root) — injection HTML dans un fichier consulté par un développeur | Carname contenant `-->` + HTML ferme le commentaire du log | ✅ Corrigé : champ comment échappé comme le `<div>` visible (chemin SMTP déjà sûr) |
| S19 | Low | `src/Controllers/CarController.php:306-308` | `image_url` de véhicule accepté sans format (owner-only) ; `javascript:` ou URL externe stockée puis rendue en `<img src>` | Hygiène : l'URL stockée n'est pas garantit être un upload géré par le serveur | ✅ Corrigé : même regex que l'unlink existant (`images/cars/car-<16hex>.<ext>`) ou chaîne vide |
| S20 | Low | `public/index.php` (aucune route logout client) | Client sans déconnexion serveur : le jeton volé vit 24 h, irrévocable sans changer le mot de passe | Ordinateur volé → session client utilisable jusqu'à expiration | ✅ Corrigé : `POST /api/auth/logout-all` (client) — révoque tous les jetons (bump `token_version`) |
| S21 | Low | `myloc-backend/public/index.php:6-10` | Le raccourci « fichier statique » concatène le chemin brut (`__DIR__ . $uri`) ; non exploitable sous Apache (normalisation avant PHP), dangereux si un jour servi autrement (`php -S`, tunnel) | Traversée `../` si la pile de service change | ✅ Corrigé : tout URI contenant `..` est refusé 404 avant le test `file_exists` |
| S22 | Low | `myloc-backend/public/.htaccess` | Aucun refus explicite de `.env/.git/backup/logs` (la sûreté repose sur leur position hors DocumentRoot) | Défense en profondeur si un fichier sensible migre un jour sous `public/` | ✅ Corrigé : bloc `FilesMatch` refusant env/log/bak/sql/ini/pem/key |
| S23 | Low | `.gitignore` | `myloc-backend/logs/` non ignoré : un `git add .` après un run en `MAIL_DRIVER=log` committerait des emails clients (PII) | Fuite de données clients dans le dépôt public | ✅ Corrigé : entrée `.gitignore` |
| S24 | Info | `AuthController.php:65,189`, `PasswordResetController.php:110`, `AgencyController.php:271,356` | bcrypt coût par défaut 10 | Coût faible pour les GPU actuels | ✅ Corrigé : coût 12 (les anciens hachages restent vérifiables) |
| S25 | Info | `AuthMiddleware.php:96-107` | La session client ignore le drapeau `active` (aucune désactivation de client aujourd'hui — latent) | Si la désactivation de clients arrive un jour, leurs jetons resteraient valables | ✅ Corrigé : `active` vérifié comme côté staff |
| S26 | ✚ Bug (hors sécurité) | `deploy/nginx-frontend.conf` | Nginx ne proxifie que `/api/` : les **images uploadées** (`/images/cars/…`) renvoient 404 en production — photos de véhicules invisibles en ligne | Photos chargées par l'agence jamais visibles du public | ✅ Corrigé : `location /images/` proxifié vers le backend |
| S27 | Info | `src/Router.php`, `src/Controllers/*` | Périmètre réel des employés : confirmations/annulations de réservations, contrôles documentaires, gestion voitures — **choix métier** | — | 📋 Documenté ; à confirmer par le propriétaire |
| S28 | Info | `RateLimiter` (compteur par compte) | Le blocage par compte peut servir à *verrouiller une victime* 15 min (5 mauvaises tentatives à son nom) | Harcèlement ciblé d'un compte | ⚠️ Accepté (pratique standard ; protège aussi l'équipe) |
| S29 | — | `C:\Users\ahcen\.claude\backups\.claude.json.backup.*` (hors dépôt) | Clé API Anthropic (`sk-ant-…`) visible dans une sauvegarde locale de configuration | — | 📋 À faire : la révoquer/regénérer chez Anthropic si elle est encore active |

## Vérifié et sans risque (non repris dans le tableau)

SQL injection : **aucune** requête construite avec des données d'utilisateur ( préparations PDO partout ;
les rares concaténations ne contiennent que des constantes internes et des `(int)`).
Uploads : MIME sniffé (finfo, liste blanche, SVG refusé), 5 Mo max, renommage serveur
(`car-<16 hex>.<ext>`), exécution PHP impossible sous `public/images`.
XSS : réponses 100 % JSON + React échappe par défaut ; emails encodés (`htmlspecialchars ENT_QUOTES`).
CSRF : structurellement impossible (auth Bearer, aucun cookie, aucun `credentials:`).
Sessions : rôle/activité/version de jeton relus en base à **chaque** requête ; MFA challenge
scope `mfa` refusé sur les routes ; TOTP avec protection anti-rejeu atomique.
Reset mot de passe : jeton 32 octets aléatoires, haché SHA-256 côté base, 30 min, usage unique,
réponse générique, limiteurs, révoque les sessions, 2FA non contournée.
IDOR : vérifié route par route (annulation, réservations, inspections, profil).
Secrets : **aucun secret jamais commité** ; `.env.example` ne contient que des placeholders.
Dépendances : phpdotenv 5.6.4, firebase/php-jwt 7.1.0, Next 16.2.10, React 19.2.4 — rien de
vulnérable épinglé. (Audit `composer`/`npm` exécuté implicitement par revue des versions ; rerun
périodique recommandé — voir checklist.)

## Checklist hors code (à faire côté serveur/opérations)

- [ ] **Rotation du mot de passe BD** avant fusion (S2) : choisir un nouveau `DB_PASS` dans
      Dokploy Environment. ⚠️ Les variables `MARIADB_*` ne s'appliquent qu'à la **première
      initialisation du volume** : si la BD tourne déjà, prévoir un `ALTER USER` dans le
      conteneur mariadb en même temps que le changement.
- [ ] Vérifier que `JWT_SECRET` et `DB_PASS` sont bien définis dans l'environnement Dokploy
      (la nouvelle config refusera le déploiement s'ils manquent — c'est voulu).
- [ ] HTTPS/TLS : Traefik gère Let's Encrypt ; activer le redirect HTTP→HTTPS si Dokploy ne
      le fait pas, et garder TLS 1.2+.
- [ ] Pare-feu de la VPS : n'exposer que 80/443 (+ SSH restreint, idéalement à clé) ; avec
      S16 les conteneurs ne publient plus de port hôte aléatoire.
- [ ] Utilisateur BD au moindre privilège : l'app tourne avec `DB_USER` (pas root) ; ne
      réserver `root` qu'à la maintenance.
- [ ] Sauvegardes : dump `mariadb-dump` quotidien du volume + stockage hors VPS ;
      tester la restauration une fois.
- [ ] fail2ban / WAF : Cloudflare devant `myloc-dz.com` (proxy orange) filtre et cache
      l'IP du serveur ; à défaut, un fail2ban sur les logs Traefik/Nginx.
- [ ] Mise à jour : `composer audit` + `npm audit` mensuels (ou Dependabot) ;
      renouveler les bases d'images (`mariadb:11`, `php:8.3-apache`, `node:22-alpine`,
      `nginx:1.27`) tous les 1–3 mois.
- [ ] Journaux : activer la rétention des logs Dokploy, suivre `login_failed`,
      `2fa_disabled` (désormais impossible par soi-même) et les `429` récurrents.
- [ ] Révoquer la clé API Anthropic exposée dans les sauvegardes `.claude` locales (S29).