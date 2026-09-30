# Déploiement Dokploy — MYLOC.DZ

Stack complète : site statique (Nginx) + API PHP (Apache) + MariaDB, avec données persistantes.

## Contenu

- `compose.yaml` — les trois services (mariadb, backend, frontend) et leurs variables ;
- `Dockerfile.frontend` — build Next.js (export statique), servi par Nginx ;
- `Dockerfile.backend` — PHP 8.3 + Apache (mod_rewrite), pdo_mysql, dépendances Composer ;
- `backend-entrypoint.sh` — génère le `.env` du backend, attend la BD, applique les migrations
  à chaque démarrage, et au **premier** lancement seulement : flotte + compte admin ;
- `nginx-frontend.conf` — sert le site avec les pages en `.html`.

## Étapes dans Dokploy

1. **Nouveau projet → Service Docker Compose**, dépôt GitHub `Ahcene-SA/myloc`, branche `main`,
   chemin du compose : `deploy/compose.yaml`.

2. **Onglet Environment** — définir au minimum :
   ```
   NEXT_PUBLIC_API_URL=https://api.TON-DOMAINE
   ALLOWED_ORIGINS=https://TON-DOMAINE
   JWT_SECRET=<chaîne aléatoire de 32+ caractères>
   DB_PASS=<mot de passe MariaDB>
   ADMIN_EMAIL=contact@myloc.dz
   ADMIN_PASSWORD=<mot de passe pour /agence>
   ```
   ⚠️ `NEXT_PUBLIC_API_URL` est **inliné au build** : si tu le changes, il faut refaire un build.
   Les deux domaines doivent coïncider exactement avec ceux attachés à l'étape 3.

3. **Attacher les domaines** — chaque service peut avoir son domaine :
   - `frontend` → ton domaine principal (`myloc.dz`) : port **80** ;
   - `backend` → un sous-domaine (`api.myloc.dz`) : port **80**.
   (Le port demandé par Dokploy est celui écouté à l'intérieur du conteneur : les deux
   containers écoutent sur **80**.)

4. **Déployer.** Au premier démarrage, le backend :
   - applique les migrations du schéma ;
   - charge la flotte (12 véhicules, prix en DA) ;
   - crée le compte admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

5. Ouvrir `https://TON-DOMAINE/agence`, se connecter avec le compte admin et activer
   la 2FA (Google Authenticator). Le premier login exige la configuration 2FA.

## Notes

- **CORS** : le backend accepte uniquement les origines de `ALLOWED_ORIGINS`. Si tu ajoutes
  un domaine, il faut aussi le mettre dans cette variable.
- **Images de véhicules** : les uploads vont dans le volume `uploads`
  (`/var/www/html/public/images` dans le conteneur). Le marqueur du premier lancement
  (`.myloc-seeded`) y vit aussi — pour relire flotte/admin, supprimer ce fichier et redémarrer.
- **E-mails** : par défaut `MAIL_DRIVER=log` (écrit dans `logs/mails/`). Pour l'envoi réel :
  `MAIL_DRIVER=smtp` + variable Gmail `SMTP_*`.
- **BD** : le volume `mariadb_data` persiste les données — redéployer ne les efface pas.
- Le tunnel Cloudflare (trycloudflare) devient inutile une fois que l'API a son propre domaine.