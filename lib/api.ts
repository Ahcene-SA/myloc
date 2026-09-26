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
    throw new Error(message);
  }

  return data;
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

export async function createCar(car: Partial<CarFromApi>): Promise<CarFromApi> {
  return request<CarFromApi>("POST", "/cars", car, true);
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

export async function updateCar(id: number, car: Partial<CarFromApi>): Promise<CarFromApi> {
  return request<CarFromApi>("PUT", `/cars/${id}`, car, true);
}

export async function deleteCar(id: number): Promise<void> {
  await request<void>("DELETE", `/cars/${id}`, undefined, true);
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
}

export interface ReservationFromApi {
  id: number;
  user_id?: number;
  user_full_name?: string;
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
  pickup_place?: string | null;
  pickup_time?: string | null;
  return_place?: string | null;
  return_time?: string | null;
  delivery_address?: string | null;
  license_number?: string | null;
  payment_method?: PaymentMethod | null;
  client_note?: string | null;
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
): Promise<unknown> {
  return request<unknown>("PATCH", `/reservations/${id}/status`, { status, admin_note: adminNote }, true);
}

/** "automatique" / "manuel" (valeurs de l'API) → libellés affichés sur le site. */
function formatTransmission(value: string): string {
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
