export type ApiChannel = {
  id: string;
  name: string;
  slug: string;
  unlocked: boolean;
};

export type ApiAlert = {
  id?: string;
  channelId?: string;
  channel_id?: string;
  channelSlug?: string;
  channel_slug?: string;
  slug?: string;
  whaleId?: string;
  whale_id?: string;
  whaleName?: string;
  whale_name?: string;
  action: "BUY" | "SELL";
  answer?: string;
  marketTitle: string;
  sizeUsd: number;
  priceCents: number;
  shares: number;
  createdAt: string;
  isHistory?: boolean;
};

export type ApiStat = {
  whaleId?: string;
  whaleName?: string;
  wins?: number;
  losses?: number;
  winRate?: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TOKEN_KEY = "rb-token";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as T[];
    }
  }

  return [];
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new ApiError(401, payload?.error || "Sesión expirada. Inicia sesión otra vez.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || `Error HTTP ${response.status}`);
  }

  return payload as T;
}

export async function fetchChannels(): Promise<ApiChannel[]> {
  const payload = await requestJson<unknown>("/api/channels", {
    method: "GET",
  });

  return unwrapList<ApiChannel>(payload);
}

export async function fetchAlerts(): Promise<ApiAlert[]> {
  const payload = await requestJson<unknown>("/api/alerts", {
    method: "GET",
  });

  return unwrapList<ApiAlert>(payload);
}

export async function fetchStats(): Promise<ApiStat[]> {
  const payload = await requestJson<unknown>("/api/stats", {
    method: "GET",
  });

  return unwrapList<ApiStat>(payload);
}

export async function unlockChannel(channelId: string): Promise<void> {
  await requestJson<unknown>(`/api/channels/${channelId}/unlock`, {
    method: "POST",
  });
}