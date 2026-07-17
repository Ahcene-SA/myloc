# MYLOC.DZ

Site vitrine de location de voitures en Algérie, construit avec [Next.js](https://nextjs.org) et [Tailwind CSS](https://tailwindcss.com).

## À propos

MYLOC.DZ est une agence de location de voitures proposant une large gamme de véhicules : citadines, SUV et berlines. Le site présente la flotte, les avantages du service, les coordonnées et un formulaire de réservation qui redirige vers WhatsApp.

## Structure

- `app/` — pages et layout Next.js (App Router)
- `components/` — composants React réutilisables (Navbar, Hero, Fleet, Features, About, Contact, Booking, Footer)
- `public/images/` — images et logos
- `lib/utils.ts` — utilitaires Tailwind (`cn`)

## Développement

Lancer le serveur de développement :

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## Build

Générer une version statique dans le dossier `dist/` :

```bash
npm run build
```

## Déploiement

Le projet est configuré en `output: "export"` pour produire un site statique. Le contenu du dossier `dist/` peut être déployé sur n’importe quel hébergement statique.

## Personnalisation

- Modifier les véhicules dans `components/Fleet.tsx`
- Modifier les coordonnées dans `components/Contact.tsx` et `components/Footer.tsx`
- Modifier le numéro WhatsApp dans `components/Booking.tsx`
- Remplacer les images dans `public/images/`

## Contact

- Téléphone / WhatsApp : +213 555 00 00 00
- Email : contact@myloc.dz
- Adresse : Alger, Algérie
