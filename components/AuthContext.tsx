"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { login as apiLogin, register as apiRegister, fetchCurrentUser, UserFromApi } from "@/lib/api";

interface AuthContextValue {
  user: UserFromApi | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
    phone: string
  ) => Promise<{ ok: boolean; error?: string; role?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFromApi | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("myloc_token");
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("myloc_token");
  });

  useEffect(() => {
    if (!token) return;
    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("myloc_token");
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      if (!res.success || !res.token) {
        return { ok: false, error: res.error || "Identifiants invalides." };
      }
      localStorage.setItem("myloc_token", res.token);
      setToken(res.token);
      setUser({
        user_id: res.user_id || 0,
        role: res.role || "client",
      });
      return { ok: true, role: res.role };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur de connexion." };
    }
  };

  const handleRegister = async (
    fullName: string,
    email: string,
    password: string,
    phone: string
  ) => {
    try {
      const res = await apiRegister(fullName, email, password, phone, "client");
      if (!res.success || !res.token) {
        return { ok: false, error: res.error || "Inscription échouée." };
      }
      localStorage.setItem("myloc_token", res.token);
      setToken(res.token);
      setUser({
        user_id: res.user_id || 0,
        role: res.role || "client",
      });
      return { ok: true, role: res.role };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur d'inscription." };
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("myloc_token");
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
