"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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

    window.localStorage.setItem(TOKEN_KEY, jwt);
    window.localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  };

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
