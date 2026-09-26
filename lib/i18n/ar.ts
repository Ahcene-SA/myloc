/**
 * Dictionnaire arabe : clé = texte français exact, valeur = traduction.
 * Découpé par zone du site pour rester lisible.
 */
import { arCommon } from "./ar-common";
import { arSite } from "./ar-site";
import { arClient } from "./ar-client";
import { arAuth } from "./ar-auth";

export const ar: Record<string, string> = { ...arCommon, ...arSite, ...arAuth, ...arClient };
