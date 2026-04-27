"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

type User = {
  email: string;
  role?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "radar_session";
const LAST_ACTIVITY_KEY = "radar_last_activity";
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000;

const TOKEN_KEY = "rb-token";
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
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);

    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  const savedToken = window.localStorage.getItem(TOKEN_KEY);
  const savedUser = window.localStorage.getItem(USER_KEY);

  if (!savedToken || !savedUser) {
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

    return {
      isAuthenticated: true,
      user: parsedUser,
      token: savedToken,
    };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);

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

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
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

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Credenciales inválidas");
    }

    const jwt = data.token;
    const userData = data.user;

    if (!jwt || !userData?.email) {
      throw new Error("Respuesta de login inválida");
    }

    setToken(jwt);
    setUser(userData);
    setIsAuthenticated(true);

    window.localStorage.setItem(SESSION_KEY, "true");
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    window.localStorage.setItem(TOKEN_KEY, jwt);
    window.localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  useEffect(() => {
    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"] as const;

    for (const event of events) {
      window.addEventListener(event, refreshActivity);
    }

    const interval = window.setInterval(() => {
      checkSession();
    }, 30_000);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, refreshActivity);
      }

      window.clearInterval(interval);
    };
  }, [checkSession, refreshActivity]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
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
