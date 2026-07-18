"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

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
  user_id: number;
  role: "admin" | "client";
  full_name?: string;
  email?: string;
  phone?: string;
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
  return request<UserFromApi>("GET", "/auth/me", undefined, true);
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

export async function createReservation(input: ReservationInput): Promise<unknown> {
  return request<unknown>("POST", "/reservations", input, true);
}

export async function fetchMyReservations(): Promise<unknown[]> {
  const res = await request<{ success: boolean; reservations?: unknown[]; error?: string }>(
    "GET",
    "/reservations/me",
    undefined,
    true
  );
  return res.reservations || [];
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
    image: car.image_url ? car.image_url.replace(/^\/?/, "") : "images/audi-png-auto-car-0.png",
    price: typeof car.price_per_day === "string" ? parseFloat(car.price_per_day) : car.price_per_day,
    priceUnit: "jour",
    transmission: car.transmission,
    seats: car.seats,
    year: car.year,
    status: car.status,
  };
}
