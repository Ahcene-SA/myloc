"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { t } from "@/lib/i18n";
import { login as apiLogin, register as apiRegister, fetchCurrentUser, isAuthError, UserFromApi } from "@/lib/api";

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
  /** Met à jour l'utilisateur en mémoire (après modification du profil). */
  updateUser: (user: UserFromApi) => void;
  /** Ouvre une session à partir d'un jeton déjà obtenu (connexion de l'espace agence). */
  startSession: (token: string, user: UserFromApi) => void;
  /** Remplace le jeton de la session courante (après un changement de mot de passe). */
  renewToken: (token: string | null | undefined) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFromApi | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("myloc_user");
      return raw ? (JSON.parse(raw) as UserFromApi) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("myloc_token");
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("myloc_token");
  });

  const persistUser = (u: UserFromApi | null) => {
    setUser(u);
    if (typeof window === "undefined") return;
    if (u) {
      localStorage.setItem("myloc_user", JSON.stringify(u));
    } else {
      localStorage.removeItem("myloc_user");
    }
  };

  useEffect(() => {
    if (!token) return;
    let stale = false;
    fetchCurrentUser()
      .then((u) => !stale && persistUser(u))
      .catch((e) => {
        // Safari interrompt les requêtes en cours quand on change de page : ce n'est pas
        // une session invalide. On n'efface la session que si le serveur l'a refusée,
        // et seulement si c'est toujours ce jeton (pas une connexion plus récente).
        if (!isAuthError(e)) return;
        if (stale || localStorage.getItem("myloc_token") !== token) return;
        localStorage.removeItem("myloc_token");
        localStorage.removeItem("myloc_user");
        setToken(null);
        setUser(null);
      })
      .finally(() => !stale && setIsLoading(false));
    return () => {
      stale = true;
    };
  }, [token]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      if (!res.success || !res.token) {
        return { ok: false, error: res.error || t("Identifiants invalides.") };
      }
      localStorage.setItem("myloc_token", res.token);
      setToken(res.token);
      // Fetch full profile immediately so name/email/phone are available before navigation.
      try {
        const profile = await fetchCurrentUser();
        persistUser(profile);
        return { ok: true, role: res.role };
      } catch (e) {
        localStorage.removeItem("myloc_token");
        localStorage.removeItem("myloc_user");
        setToken(null);
        return { ok: false, error: e instanceof Error ? e.message : t("Impossible de charger le profil.") };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : t("Erreur de connexion.") };
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
        return { ok: false, error: res.error || t("Inscription échouée.") };
      }
      localStorage.setItem("myloc_token", res.token);
      setToken(res.token);
      try {
        const profile = await fetchCurrentUser();
        persistUser(profile);
        return { ok: true, role: res.role };
      } catch (e) {
        localStorage.removeItem("myloc_token");
        localStorage.removeItem("myloc_user");
        setToken(null);
        return { ok: false, error: e instanceof Error ? e.message : t("Impossible de charger le profil.") };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : t("Erreur d'inscription.") };
    }
  };

  const startSession = (newToken: string, u: UserFromApi) => {
    localStorage.setItem("myloc_token", newToken);
    persistUser(u);
    setToken(newToken);
  };

  const renewToken = (newToken: string | null | undefined) => {
    if (!newToken) return;
    localStorage.setItem("myloc_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("myloc_token");
      localStorage.removeItem("myloc_user");
      // Réservation en cours (nom, permis…) : rien ne doit rester sur un PC partagé
      try {
        sessionStorage.removeItem("myloc_reserver_draft");
        sessionStorage.removeItem("myloc_client_nav");
      } catch {
        /* navigation privée */
      }
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
        updateUser: persistUser,
        startSession,
        renewToken,
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
