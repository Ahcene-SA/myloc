"use client";

export function getApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  // En développement (npm run dev), Next relaie /api vers l'API PHP locale :
  // on appelle donc la même adresse que le site (voir next.config.ts).
  if (process.env.NODE_ENV !== "production") {
    return "";
  }

  // Runtime overrides (no rebuild needed).
  if (typeof (window as unknown as Record<string, string>).MYLOC_API_URL === "string") {
    return (window as unknown as Record<string, string>).MYLOC_API_URL.replace(/\/$/, "");
  }

  try {
    const stored = localStorage.getItem("myloc_api_url");
    if (stored) return stored.replace(/\/$/, "");
  } catch {
    // localStorage may be unavailable (private mode, file://, etc.)
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // Par défaut : backend PHP lancé en local (php -S localhost:8000 …).
  return "http://localhost:8000";
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

export interface UserFromApi {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "client";
  created_at?: string;
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

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = (await response.json().catch(() => ({
    success: false,
    error: "Réponse invalide du serveur.",
  }))) as T & { success?: boolean; error?: string };

  if (!response.ok || data.success === false) {
    const message = data.error || `Erreur HTTP ${response.status}`;
    if (response.status === 401 && auth) handleExpiredSession();
    throw new Error(message);
  }

  return data;
}

/** Jeton expiré ou invalide : on vide la session et on renvoie vers la connexion. */
function handleExpiredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("myloc_token");
  localStorage.removeItem("myloc_user");
  const login = process.env.NODE_ENV === "production" ? "./login.html" : "/login";
  window.setTimeout(() => window.location.replace(`${login}?expired=1`), 1200);
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
  discount_source: "duration" | "loyalty" | "promo" | null;
  promo_code: string | null;
  promo: { valid: boolean; message: string } | null;
  loyalty: { rentals: number; needed: number; percent: number } | null;
}

export interface PricingRules {
  duration: { min_days: number; percent: number }[];
  loyalty: { enabled: boolean; min_rentals: number; percent: number };
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

/** Devis avec la meilleure remise (le jeton est envoyé s'il existe, pour la fidélité). */
export async function fetchQuote(carId: number, start: string, end: string, promoCode?: string): Promise<PricingQuote> {
  const res = await request<{ success: boolean; quote: PricingQuote }>(
    "POST",
    "/pricing/quote",
    { car_id: carId, start_date: start, end_date: end, promo_code: promoCode || undefined },
    true
  );
  return res.quote;
}

export async function fetchPricingRules(): Promise<PricingRules> {
  const res = await request<{ success: boolean; rules: PricingRules }>("GET", "/pricing/rules");
  return res.rules;
}

export async function updatePricingRules(rules: PricingRules): Promise<PricingRules> {
  const res = await request<{ success: boolean; rules: PricingRules }>("PUT", "/admin/pricing-rules", rules, true);
  return res.rules;
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

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = (await response.json().catch(() => ({
    success: false,
    error: "Réponse invalide du serveur.",
  }))) as { success?: boolean; image_url?: string; error?: string };

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Erreur HTTP ${response.status}`);
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

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<unknown>(
    "PUT",
    "/auth/password",
    { current_password: currentPassword, new_password: newPassword },
    true
  );
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
