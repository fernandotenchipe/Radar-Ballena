/**
 * CSRF Protection utilities
 * Generates and validates CSRF tokens to prevent cross-site request forgery attacks
 */

const CSRF_TOKEN_KEY = "X-CSRF-Token";
const CSRF_SESSION_KEY = "csrf-token";

/**
 * Get the CSRF token from sessionStorage
 * SessionStorage is safer than localStorage for CSRF tokens as it's not persisted across tabs
 */
export function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CSRF_SESSION_KEY);
}

/**
 * Set the CSRF token in sessionStorage
 * Should be called after fetching from the server
 */
export function setCsrfToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CSRF_SESSION_KEY, token);
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CSRF_SESSION_KEY);
}

/**
 * Get headers with CSRF token included
 * Use this for state-changing requests (POST, PUT, DELETE)
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { [CSRF_TOKEN_KEY]: token } : {};
}

/**
 * Fetch a new CSRF token from the server
 * Should be called once when the app loads
 */
export async function fetchCsrfToken(apiUrl: string): Promise<string> {
  try {
    const response = await fetch(`${apiUrl}/api/csrf-token`, {
      method: "GET",
      credentials: "include", // Include cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = (await response.json()) as { token: string };
    const token = data.token;

    if (!token) {
      throw new Error("No CSRF token in response");
    }

    setCsrfToken(token);
    return token;
  } catch (error) {
    console.error("CSRF token fetch failed:", error);
    throw error;
  }
}
