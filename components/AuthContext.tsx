"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getCsrfToken, clearCsrfToken, getCsrfHeaders, fetchCsrfToken } from "@/lib/csrf";

type User = {
  email: string;
  role?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  completeInviteRegistration: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "radar_session";
const LAST_ACTIVITY_KEY = "radar_last_activity";
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000;

// NOTE: Token is NO LONGER stored in localStorage
// It's now stored in httpOnly cookies managed by the server
// Only the user info is stored locally (not sensitive)
const USER_KEY = "rb-user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getInitialAuthState(): {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
} {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  const session = window.localStorage.getItem(SESSION_KEY);
  const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

  if (session !== "true" || !lastActivity || Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(USER_KEY);
    clearCsrfToken();

    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  const savedUser = window.localStorage.getItem(USER_KEY);

  if (!savedUser) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  try {
    const parsedUser = JSON.parse(savedUser) as User;

    if (!parsedUser?.email) {
      throw new Error("Invalid stored user");
    }

    // Token is in httpOnly cookie, not accessible here
    // We trust the cookie is present if session is valid
    return {
      isAuthenticated: true,
      user: parsedUser,
      token: "cookie", // Placeholder - actual token is in httpOnly cookie
    };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(USER_KEY);
    clearCsrfToken();

    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuth = getInitialAuthState();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);

  function persistSession(userData: User) {
    // Token is stored in httpOnly cookie by the server, not here
    setToken("cookie"); // Placeholder
    setUser(userData);
    setIsAuthenticated(true);

    window.localStorage.setItem(SESSION_KEY, "true");
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    window.localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(USER_KEY);
    clearCsrfToken();
  }, []);

  const refreshActivity = useCallback(() => {
    if (window.localStorage.getItem(SESSION_KEY) === "true") {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
  }, []);

  const checkSession = useCallback(() => {
    const session = window.localStorage.getItem(SESSION_KEY);
    const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

    if (session !== "true") {
      setIsAuthenticated(false);
      return;
    }

    if (!lastActivity || Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
      logout();
      return;
    }

    setIsAuthenticated(true);
  }, [logout]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error("Email y contraseña son requeridos");
    }

    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL no está configurada");
    }

    // Get CSRF token if not already present
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      csrfToken = await fetchCsrfToken(API_URL);
    }

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include", // Send and receive cookies (httpOnly)
      headers: {
        "Content-Type": "application/json",
        ...getCsrfHeaders(), // Add CSRF token to headers
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Credenciales inválidas");
    }

    const userData = data.user;

    if (!userData?.email) {
      throw new Error("Respuesta de login inválida");
    }

    // Token is now in httpOnly cookie, don't store it here
    persistSession(userData);
  };

  const completeInviteRegistration = (jwt: string, userData: User) => {
    // Persist the authenticated session returned by the backend after invite registration
    // Note: jwt is not used (already in httpOnly cookie), but kept for API compatibility
    persistSession(userData);
  };

  useEffect(() => {
    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"] as const;

    for (const event of events) {
      window.addEventListener(event, refreshActivity);
    }

    const interval = window.setInterval(() => {
      checkSession();
    }, 30_000);

    // Fetch CSRF token on app startup
    if (API_URL && !getCsrfToken()) {
      fetchCsrfToken(API_URL).catch((error) => {
        console.error("Failed to initialize CSRF token:", error);
      });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, refreshActivity);
      }

      window.clearInterval(interval);
    };
  }, [checkSession, refreshActivity]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, completeInviteRegistration, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
