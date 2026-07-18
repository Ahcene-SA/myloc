"use client";

function getApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
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

  // Allow overriding via query parameter.
  // Example: https://example.com/?apiUrl=https://api.example.com
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("apiUrl");
  if (queryUrl) {
    try {
      const parsed = new URL(queryUrl);
      return parsed.origin;
    } catch {
      // ignore invalid URL
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // WAMP fallback: when the frontend is served from anywhere under /myloc/ on localhost,
  // the backend is reachable under /myloc/myloc-backend/public (default WAMP directory layout).
  // When served via the PHP built-in server, it usually runs on port 8000.
  const { hostname, port, pathname, protocol } = window.location;
  if ((hostname === "localhost" || hostname === "127.0.0.1") && pathname.startsWith("/myloc/")) {
    return `${protocol}//${hostname}${port ? `:${port}` : ""}/myloc/myloc-backend/public`;
  }

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

export interface ReservationInput {
  car_id: number;
  start_date: string;
  end_date: string;
  full_name: string;
  email: string;
  phone: string;
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
  admin_note?: string;
  total_price?: string | number;
  created_at?: string;
}

export async function createReservation(input: ReservationInput): Promise<unknown> {
  return request<unknown>("POST", "/reservations", input, true);
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
  return {
    id: String(car.id),
    name: car.name,
    category: car.category,
    image: car.image_url
      ? car.image_url.startsWith("http")
        ? car.image_url
        : car.image_url.replace(/^\/?/, "")
      : "images/audi-png-auto-car-0.png",
    price: typeof car.price_per_day === "string" ? parseFloat(car.price_per_day) : car.price_per_day,
    priceUnit: "jour",
    transmission: car.transmission,
    seats: car.seats,
    year: car.year,
    status: car.status,
  };
}
