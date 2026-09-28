/**
 * Liens entre les pages.
 * - En développement (npm run dev) : /client, /login…
 * - En production (export statique, GitHub Pages) : ./client.html, ./login.html…
 */
export type PageName = "client" | "admin" | "login" | "register" | "contrat" | "agence" | "reinitialiser";

export function pageUrl(name: PageName): string {
  return process.env.NODE_ENV === "production" ? `./${name}.html` : `/${name}`;
}
