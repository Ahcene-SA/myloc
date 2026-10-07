"use client";

import { translate } from "./i18n";

export function getApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  // En développement (npm run dev), Next relaie /api vers l'API PHP locale :
  // on appelle donc la même adresse que le site (voir next.config.ts).
  if (process.env.NODE_ENV !== "production") {
    return "";
  }

  // Surcharge runtime (window.MYLOC_API_URL / localStorage, tests) :
  // jamais en production, sinon un script injecté pourrait détourner
  // toutes les requêtes (et le jeton) vers un autre serveur.
  if (process.env.NODE_ENV !== "production") {
    if (typeof (window as unknown as Record<string, string>).MYLOC_API_URL === "string") {
      return (window as unknown as Record<string, string>).MYLOC_API_URL.replace(/\/$/, "");
    }
    try {
      const stored = localStorage.getItem("myloc_api_url");
      if (stored) return stored.replace(/\/$/, "");
    } catch {
      // localStorage may be unavailable (private mode, file://, etc.)
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // Par défaut : backend PHP lancé en local (php -S localhost:8000 …).
  return "http://localhost:8000";
}

/** Erreur renvoyée par l'API, avec son code HTTP (401 = session invalide). */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const NETWORK_ERROR_MESSAGE = "Impossible de joindre le serveur. Vérifiez votre connexion.";

/** Le serveur n'a pas pu être joint (aucune réponse HTTP). */
export class NetworkError extends Error {
  constructor() {
    super(translate(NETWORK_ERROR_MESSAGE));
  }
}

/** Vrai seulement si le serveur a refusé la session (et pas pour une coupure réseau). */
export function isAuthError(e: unknown): boolean {
  return e instanceof HttpError && (e.status === 401 || e.status === 403);
}

export interface ApiError {
  success: false;
  error: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface CarFromApi {
  id: number;
  category: string;
  name: string;
  description?: string;
  price_per_day: string | number;
  transmission: string;
  seats: number;
  year: number;
  image_url?: string;
  status: string;
  created_at?: string;
  /** Immatriculation (administration uniquement) */
  plate?: string | null;
  /** Renvoyé par /admin/cars uniquement */
  reservations_count?: number;
}

export type Role = "owner" | "employee" | "client" | "admin";

export interface UserFromApi {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  created_at?: string;
  /* Équipe de l'agence uniquement */
  active?: boolean;
  must_change_password?: boolean;
  agency?: string | null;
  totp_enabled?: boolean;
  last_login_at?: string | null;
}

/** Membre de l'équipe de l'agence (propriétaire ou employé). */
export function isStaff(role?: string | null): boolean {
  return role === "owner" || role === "employee" || role === "admin";
}

export function isOwner(role?: string | null): boolean {
  return role === "owner" || role === "admin";
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: number;
  role?: "admin" | "client";
  token?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("myloc_token");
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  auth = false
): Promise<T> {
  const API_BASE = getApiBase();
  const url = `${API_BASE}/api${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const sentToken = auth ? getToken() : null;
  if (sentToken) {
    headers["Authorization"] = `Bearer ${sentToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      // Toujours la version à jour (Safari peut sinon resservir une ancienne réponse)
      cache: "no-store",
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    // Coupure réseau / serveur éteint : pas de « Failed to fetch » brut à l'écran
    throw new NetworkError();
  }

  const data = (await response.json().catch(() => ({
    success: false,
    error: "Réponse invalide du serveur.",
  }))) as T & { success?: boolean; error?: string };

  if (!response.ok || data.success === false) {
    const message = data.error || `Erreur HTTP ${response.status}`;
    if (response.status === 401 && sentToken) handleExpiredSession(sentToken, message);
    throw new HttpError(translate(message), response.status);
  }

  return data;
}

/**
 * Jeton expiré ou invalide : on vide la session et on renvoie vers la connexion.
 * - seulement si c'est bien ce jeton-là qui est encore enregistré (sinon une connexion
 *   toute récente serait effacée par une ancienne requête) ;
 * - jamais de redirection depuis les pages de connexion / inscription (on y est déjà).
 */
function handleExpiredSession(sentToken: string, message = "") {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("myloc_token") !== sentToken) return;
  localStorage.removeItem("myloc_token");
  localStorage.removeItem("myloc_user");
  const path = window.location.pathname;
  if (/\/(login|register|agence|reinitialiser)(\.html)?$/.test(path)) return;
  // L'équipe retourne vers l'espace agence, les clients vers la connexion client
  const staffPage = /\/(admin|contrat)(\.html)?$/.test(path);
  const page = staffPage ? "agence" : "login";
  const url = process.env.NODE_ENV === "production" ? `./${page}.html` : `/${page}`;
  window.setTimeout(() => {
    // Entre-temps, l'utilisateur a pu se reconnecter dans un autre onglet
    const reason = /inactivit/i.test(message) ? "idle" : /désactivé/i.test(message) ? "disabled" : "1";
    if (!localStorage.getItem("myloc_token")) window.location.replace(`${url}?expired=${reason}`);
  }, 1200);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("POST", "/auth/login", { email, password });
}

export async function register(
  fullName: string,
  email: string,
  password: string,
  phone: string,
  role: "client" | "admin" = "client"
): Promise<LoginResponse> {
  return request<LoginResponse>("POST", "/auth/register", {
    full_name: fullName,
    email,
    password,
    phone,
    role,
  });
}

export async function fetchCurrentUser(): Promise<UserFromApi> {
  const res = await request<{ success: boolean; user?: UserFromApi; error?: string }>(
    "GET",
    "/auth/me",
    undefined,
    true
  );
  if (!res.user) {
    throw new Error("Profil utilisateur introuvable.");
  }
  return res.user;
}

export interface ClientFromApi {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  reservations_count?: number | string;
  confirmed_total?: number | string;
  last_reservation_at?: string | null;
}

export async function fetchClients(): Promise<ClientFromApi[]> {
  const res = await request<{ success: boolean; clients?: ClientFromApi[]; error?: string }>(
    "GET",
    "/auth/clients",
    undefined,
    true
  );
  return res.clients || [];
}

export async function fetchCars(): Promise<CarFromApi[]> {
  const res = await request<{ success: boolean; cars?: CarFromApi[]; error?: string }>(
    "GET",
    "/cars"
  );
  return res.cars || [];
}

export interface AvailableCar extends CarFromApi {
  days: number;
  base_price: number;
  total_price: number;
  discount_label?: string | null;
}

/* ─────────────── Prix et remises ─────────────── */

export interface PricingQuote {
  days: number;
  price_per_day: number;
  base_price: number;
  discount_amount: number;
  total_price: number;
  discount_label: string | null;
  discount_source: "promo" | null;
  promo_code: string | null;
  promo: { valid: boolean; message: string } | null;
}

export interface PromoCode {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: string | number;
  min_days?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  uses: number;
  active: number | boolean;
  created_at?: string;
}

/** Devis : le total et la vérification d'un code promo saisi par le client. */
export async function fetchQuote(carId: number, start: string, end: string, promoCode?: string): Promise<PricingQuote> {
  const res = await request<{ success: boolean; quote: PricingQuote }>(
    "POST",
    "/pricing/quote",
    { car_id: carId, start_date: start, end_date: end, promo_code: promoCode || undefined },
    true
  );
  return res.quote;
}

export async function fetchPromos(): Promise<PromoCode[]> {
  const res = await request<{ success: boolean; promos?: PromoCode[] }>("GET", "/admin/promos", undefined, true);
  return res.promos || [];
}

export async function savePromo(promo: Partial<PromoCode>): Promise<PromoCode | undefined> {
  const res = await request<{ success: boolean; promo?: PromoCode }>(
    promo.id ? "PUT" : "POST",
    promo.id ? `/admin/promos/${promo.id}` : "/admin/promos",
    promo,
    true
  );
  return res.promo;
}

export async function deletePromo(id: number): Promise<void> {
  await request<unknown>("DELETE", `/admin/promos/${id}`, undefined, true);
}

/** Véhicules libres entre deux dates (le jour du retour reste libre), avec le prix total. */
export async function fetchAvailableCars(start: string, end: string, category = "all"): Promise<AvailableCar[]> {
  const q = new URLSearchParams({ start, end, category });
  const res = await request<{ success: boolean; cars?: AvailableCar[] }>("GET", `/cars/available?${q}`);
  return res.cars || [];
}

/** Administration : toute la flotte, y compris les véhicules retirés du site. */
export async function fetchAllCars(): Promise<CarFromApi[]> {
  const res = await request<{ success: boolean; cars?: CarFromApi[] }>("GET", "/admin/cars", undefined, true);
  return res.cars || [];
}

export async function createCar(car: Partial<CarFromApi>): Promise<CarFromApi | undefined> {
  const res = await request<{ success: boolean; car?: CarFromApi }>("POST", "/cars", car, true);
  return res.car;
}

export async function uploadCarImage(file: File): Promise<string> {
  const API_BASE = getApiBase();
  const url = `${API_BASE}/api/cars/upload`;
  const formData = new FormData();
  formData.append("image", file);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers, body: formData });
  } catch {
    throw new NetworkError();
  }

  const data = (await response.json().catch(() => ({
    success: false,
    error: "Réponse invalide du serveur.",
  }))) as { success?: boolean; image_url?: string; error?: string };

  if (!response.ok || data.success === false) {
    throw new Error(translate(data.error || `Erreur HTTP ${response.status}`));
  }

  if (!data.image_url) {
    throw new Error("Aucune URL d'image reçue.");
  }

  return data.image_url;
}

export async function updateCar(id: number, car: Partial<CarFromApi>): Promise<CarFromApi | undefined> {
  const res = await request<{ success: boolean; car?: CarFromApi }>("PUT", `/cars/${id}`, car, true);
  return res.car;
}

/** Supprime le véhicule, ou le retire seulement du site s'il a un historique de réservations. */
export async function deleteCar(id: number): Promise<{ deleted: boolean; message: string }> {
  const res = await request<{ success: boolean; deleted?: boolean; message?: string }>("DELETE", `/cars/${id}`, undefined, true);
  return { deleted: !!res.deleted, message: res.message || "" };
}

export type PaymentMethod = "especes" | "carte" | "virement";

export interface ReservationInput {
  car_id: number;
  start_date: string;
  end_date: string;
  full_name: string;
  email: string;
  phone: string;
  pickup_place?: string;
  pickup_time?: string;
  return_place?: string;
  return_time?: string;
  delivery_address?: string;
  license_number?: string;
  payment_method?: PaymentMethod;
  client_note?: string;
  promo_code?: string;
}

export interface ReservationFromApi {
  id: number;
  user_id?: number;
  user_full_name?: string | null;
  user_email?: string | null;
  /** "site" (réservée par le client) ou "agence" (saisie par l'agence) */
  source?: "site" | "agence";
  updated_at?: string | null;
  car_id?: number;
  car_name?: string;
  car_category?: string;
  start_date?: string;
  end_date?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status?: "pending" | "confirmed" | "rejected" | "cancelled";
  admin_note?: string | null;
  total_price?: string | number;
  created_at?: string;
  car_image_url?: string | null;
  car_price_per_day?: string | number;
  car_transmission?: string;
  car_seats?: number;
  car_plate?: string | null;
  car_year?: number;
  pickup_place?: string | null;
  pickup_time?: string | null;
  return_place?: string | null;
  return_time?: string | null;
  delivery_address?: string | null;
  license_number?: string | null;
  payment_method?: PaymentMethod | null;
  client_note?: string | null;
  base_price?: string | number | null;
  discount_amount?: string | number | null;
  discount_label?: string | null;
  promo_code?: string | null;
}

export interface BookedRange {
  start_date: string;
  end_date: string;
}

export interface CreateReservationResponse {
  success: boolean;
  reservation?: ReservationFromApi;
  total_price?: number;
  days?: number;
}

export async function createReservation(input: ReservationInput): Promise<CreateReservationResponse> {
  return request<CreateReservationResponse>("POST", "/reservations", input, true);
}

export async function cancelReservation(id: number): Promise<ReservationFromApi | undefined> {
  const res = await request<{ success: boolean; reservation?: ReservationFromApi }>(
    "PATCH",
    `/reservations/${id}/cancel`,
    undefined,
    true
  );
  return res.reservation;
}

/** Périodes déjà réservées pour une voiture (pour prévenir le client avant l'envoi). */
export async function fetchBookedRanges(carId: number): Promise<BookedRange[]> {
  const res = await request<{ success: boolean; booked?: BookedRange[] }>("GET", `/cars/${carId}/booked`);
  return res.booked || [];
}

export async function updateProfile(fullName: string, phone: string): Promise<UserFromApi | undefined> {
  const res = await request<{ success: boolean; user?: UserFromApi }>(
    "PUT",
    "/auth/me",
    { full_name: fullName, phone },
    true
  );
  return res.user;
}

/**
 * Change le mot de passe. Le serveur révoque les autres sessions et renvoie un nouveau
 * jeton pour celle-ci : on l'enregistre comme à la connexion (clé myloc_token), sinon
 * la session courante serait déconnectée à la requête suivante.
 * Renvoie le nouveau jeton (ou null si le serveur n'en envoie pas).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
  const res = await request<{ success: boolean; token?: string }>(
    "PUT",
    "/auth/password",
    { current_password: currentPassword, new_password: newPassword },
    true
  );
  const token = typeof res.token === "string" && res.token ? res.token : null;
  if (token && typeof window !== "undefined") {
    try {
      localStorage.setItem("myloc_token", token);
    } catch {
      /* navigation privée */
    }
  }
  return token;
}

/** URL complète d'une image renvoyée par l'API (chemin relatif → servi par le backend). */
export function apiImageUrl(path?: string | null): string {
  if (!path) return "images/audi-png-auto-car-0.png";
  if (path.startsWith("http")) return path;
  return `${getApiBase()}/${path.replace(/^\/?/, "")}`;
}

export async function fetchMyReservations(): Promise<ReservationFromApi[]> {
  const res = await request<{ success: boolean; reservations?: ReservationFromApi[]; error?: string }>(
    "GET",
    "/reservations/me",
    undefined,
    true
  );
  return res.reservations || [];
}

export async function fetchAllReservations(): Promise<ReservationFromApi[]> {
  const res = await request<{ success: boolean; reservations?: ReservationFromApi[]; error?: string }>(
    "GET",
    "/reservations",
    undefined,
    true
  );
  return res.reservations || [];
}

export async function updateReservationStatus(
  id: number,
  status: "pending" | "confirmed" | "rejected" | "cancelled",
  adminNote?: string
): Promise<ReservationFromApi | undefined> {
  const body: Record<string, string> = { status };
  if (adminNote !== undefined) body.admin_note = adminNote;
  const res = await request<{ success: boolean; reservation?: ReservationFromApi }>(
    "PATCH",
    `/reservations/${id}/status`,
    body,
    true
  );
  return res.reservation;
}

export interface AdminReservationInput extends Omit<ReservationInput, "email"> {
  email?: string;
  /** Rattache la réservation à un compte client existant */
  user_id?: number;
  status?: "pending" | "confirmed";
  /** Montant négocié ; vide = prix/jour × nombre de jours (avec remises) */
  total_price?: number | string;
  promo_code?: string;
  admin_note?: string;
}

/** L'agence enregistre une réservation prise par WhatsApp, téléphone ou au comptoir. */
export async function adminCreateReservation(input: AdminReservationInput): Promise<ReservationFromApi | undefined> {
  const res = await request<{ success: boolean; reservation?: ReservationFromApi }>("POST", "/admin/reservations", input, true);
  return res.reservation;
}

/** "automatique" / "manuel" (valeurs de l'API) → libellés affichés sur le site. */
export function formatTransmission(value: string): string {
  const v = (value || "").toLowerCase();
  if (v.startsWith("auto")) return "Automatique";
  if (v.startsWith("manu")) return "Manuelle";
  return value;
}

export function mapApiCarToCar(car: CarFromApi): {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  priceUnit: string;
  transmission: string;
  seats: number;
  year: number;
  status: string;
} {
  const base = getApiBase();
  return {
    id: String(car.id),
    name: car.name,
    category: car.category,
    image: car.image_url
      ? car.image_url.startsWith("http")
        ? car.image_url
        : `${base}/${car.image_url.replace(/^\/?/, "")}`
      : "images/audi-png-auto-car-0.png",
    price: typeof car.price_per_day === "string" ? parseFloat(car.price_per_day) : car.price_per_day,
    priceUnit: "jour",
    transmission: formatTransmission(car.transmission),
    seats: car.seats,
    year: car.year,
    status: car.status,
  };
}

/* ─────────────── États des lieux ─────────────── */

export type InspectionType = "depart" | "retour";

export const DAMAGE_ZONES = [
  "avant",
  "capot",
  "pare-brise",
  "toit",
  "arriere",
  "coffre",
  "flanc-gauche",
  "flanc-droit",
  "jantes",
  "interieur",
] as const;
export type DamageZone = (typeof DAMAGE_ZONES)[number];

export const zoneLabels: Record<DamageZone, string> = {
  avant: "Pare-chocs avant",
  capot: "Capot",
  "pare-brise": "Pare-brise",
  toit: "Toit",
  arriere: "Pare-chocs arrière",
  coffre: "Coffre",
  "flanc-gauche": "Côté gauche",
  "flanc-droit": "Côté droit",
  jantes: "Jantes / pneus",
  interieur: "Intérieur",
};

export interface Inspection {
  id?: number;
  type: InspectionType;
  mileage: number | null;
  fuel_level: number | null;
  damages: { zone: DamageZone; note: string }[];
  photos: string[];
  notes: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export type InspectionSet = Partial<Record<InspectionType, Inspection>>;

export async function fetchInspections(reservationId: number): Promise<InspectionSet> {
  const res = await request<{ success: boolean; inspections: InspectionSet }>("GET", `/reservations/${reservationId}/inspections`, undefined, true);
  return res.inspections || {};
}

export async function saveInspection(
  reservationId: number,
  type: InspectionType,
  data: Omit<Inspection, "type" | "id">
): Promise<InspectionSet> {
  const res = await request<{ success: boolean; inspections: InspectionSet }>(
    "PUT",
    `/admin/reservations/${reservationId}/inspections/${type}`,
    data,
    true
  );
  return res.inspections || {};
}

/** Réduit une photo de téléphone (souvent 4-8 Mo) avant l'envoi : 1600 px, JPEG. */
async function shrinkPhoto(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

export async function uploadInspectionPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", await shrinkPhoto(file), "photo.jpg");
  const res = await request<{ success: boolean; path?: string }>("POST", "/admin/inspections/upload", form, true);
  if (!res.path) throw new Error("Photo non enregistrée.");
  return res.path;
}

/* ─────────────── Espace agence ─────────────── */

/** Étape de connexion agence commencée depuis la page de connexion client (reprise sur /agence). */
export const AGENCY_PENDING_KEY = "myloc_agency_pending";

export interface AgencyLoginResult {
  step: "totp" | "totp_setup" | "done";
  challenge?: string;
  secret?: string;
  otpauth?: string;
  token?: string;
  role?: Role;
  user?: UserFromApi;
  recovery_codes?: string[];
  recovery_codes_left?: number;
}

// ───────── Mot de passe oublié ─────────

/** Envoie le lien par e-mail (réponse identique que le compte existe ou non). */
export async function requestPasswordReset(email: string): Promise<string> {
  const res = await request<{ success: boolean; message: string }>("POST", "/auth/forgot", { email });
  return res.message;
}

export async function checkResetToken(token: string): Promise<{ first_name: string; staff: boolean }> {
  return request<{ success: boolean; first_name: string; staff: boolean }>("GET", `/auth/reset?token=${encodeURIComponent(token)}`);
}

export async function resetPassword(token: string, password: string): Promise<{ staff: boolean }> {
  return request<{ success: boolean; staff: boolean }>("POST", "/auth/reset", { token, password });
}

// ───────── Alertes de l'espace agence ─────────

export interface AgencyUpdates {
  latest_id: number;
  pending_count: number;
  reservations: ReservationFromApi[];
}

/** Nouvelles réservations depuis `since` (ne prolonge pas la session). */
export async function fetchAgencyUpdates(since: number): Promise<AgencyUpdates> {
  return request<AgencyUpdates & { success: boolean }>("GET", `/agency/updates?since=${since}`, undefined, true);
}

export async function agencyLogin(email: string, password: string): Promise<AgencyLoginResult> {
  return request<AgencyLoginResult>("POST", "/agency/login", { email, password });
}

export async function agencyVerify(challenge: string, code: { code?: string; recovery_code?: string }): Promise<AgencyLoginResult> {
  return request<AgencyLoginResult>("POST", "/agency/verify", { challenge, ...code });
}

/** Garde la session agence active (et vérifie qu'elle l'est encore). */
export async function agencyPing(): Promise<UserFromApi | undefined> {
  const res = await request<{ success: boolean; user?: UserFromApi }>("GET", "/agency/me", undefined, true);
  return res.user;
}

export async function agencyLogoutAll(): Promise<void> {
  await request<unknown>("POST", "/agency/logout-all", undefined, true);
}

export async function twoFactorSetup(): Promise<{ secret: string; otpauth: string }> {
  return request<{ success: boolean; secret: string; otpauth: string }>("POST", "/agency/2fa/setup", undefined, true);
}

export async function twoFactorEnable(code: string): Promise<string[]> {
  const res = await request<{ success: boolean; recovery_codes: string[] }>("POST", "/agency/2fa/enable", { code }, true);
  return res.recovery_codes;
}

export async function regenerateRecoveryCodes(code: string): Promise<string[]> {
  const res = await request<{ success: boolean; recovery_codes: string[] }>("POST", "/agency/2fa/recovery-codes", { code }, true);
  return res.recovery_codes;
}

export interface TeamMember extends UserFromApi {
  role: "owner" | "employee";
}

export async function fetchTeam(): Promise<TeamMember[]> {
  const res = await request<{ success: boolean; team?: TeamMember[] }>("GET", "/agency/team", undefined, true);
  return res.team || [];
}

export async function createTeamMember(input: {
  full_name: string;
  email: string;
  phone: string;
  agency?: string;
  role: "owner" | "employee";
}): Promise<{ member: TeamMember; temporary_password: string }> {
  return request<{ success: boolean; member: TeamMember; temporary_password: string }>("POST", "/agency/team", input, true);
}

export async function updateTeamMember(
  id: number,
  fields: Partial<Pick<TeamMember, "full_name" | "phone" | "agency" | "role" | "active">>
): Promise<TeamMember | undefined> {
  const res = await request<{ success: boolean; member?: TeamMember }>("PUT", `/agency/team/${id}`, fields, true);
  return res.member;
}

export async function resetMemberPassword(id: number): Promise<string> {
  const res = await request<{ success: boolean; temporary_password: string }>("POST", `/agency/team/${id}/reset-password`, undefined, true);
  return res.temporary_password;
}

export async function resetMemberTwoFactor(id: number): Promise<void> {
  await request<unknown>("POST", `/agency/team/${id}/reset-2fa`, undefined, true);
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export async function fetchAudit(filters: {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditEntry[]; total: number }> {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  const res = await request<{ success: boolean; entries: AuditEntry[]; total: number }>("GET", `/agency/audit?${q}`, undefined, true);
  return { entries: res.entries || [], total: res.total || 0 };
}
