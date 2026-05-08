"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import Image from "next/image";
import Link from "next/link";

type User = {
  email: string;
  role?: string;
};

export default function CreateAccountWithInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeInviteRegistration } = useAuth();

  const token = searchParams?.get("token");
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [status, setStatus] = useState<"idle" | "validating" | "invalid" | "valid">(
    token ? "validating" : "idle"
  );
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      return;
    }

    if (!API_URL) {
      setError("NEXT_PUBLIC_API_URL no está configurada en el frontend.");
      setStatus("invalid");
      return;
    }

    let cancelled = false;

    async function validate() {
      setStatus("validating");
      setError(null);

      try {
        const res = await fetch(`${API_URL}/api/invites/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok || !data?.valid) {
          if (!cancelled) {
            setError(data?.error || "Invitación inválida o expirada.");
            setStatus("invalid");
          }
          return;
        }

        if (!cancelled) {
          setEmail(data.email || null);
          setStatus("valid");
        }
      } catch (e) {
        if (!cancelled) {
          setError("Error validando la invitación");
          setStatus("invalid");
        }
      }
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [token, API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Necesitas un enlace de invitación válido.");
      return;
    }

    if (!API_URL) {
      setError("NEXT_PUBLIC_API_URL no está configurada.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register-with-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Error al crear la cuenta");
        setSubmitting(false);
        return;
      }

      const jwt = data.token;
      const userData: User = data.user;

      if (!jwt || !userData?.email) {
        setError("Respuesta inválida del servidor");
        setSubmitting(false);
        return;
      }

      // Persist authenticated session via AuthContext helper
      completeInviteRegistration(jwt, userData);

      // Redirect to dashboard
      router.push("/");
    } catch (e) {
      setError("Error de red al crear la cuenta");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="login-logo-wrapper">
            <Image
              src="/radarballena-logo.png"
              alt="RadarBallena"
              width={220}
              height={50}
              priority
              className="login-logo-image h-auto w-auto"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Crear cuenta</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Usa tu enlace de invitación para crear tu cuenta</p>
          </div>

          {(!token || status === "idle") && (
            <div className="text-sm text-[var(--Color-text-secondary)]">
              <p className="text-[var(--color-text-secondary)]">Necesitas un enlace de invitación válido.</p>
              <p className="mt-3">
                <Link href="/login" className="font-semibold text-[#06b6d4]">Volver al login</Link>
              </p>
            </div>
          )}

          {status === "validating" && (
            <div className="text-sm text-[var(--color-text-secondary)]">Validando invitación...</div>
          )}

          {status === "invalid" && (
            <div>
              <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3">
                <p className="text-sm text-[#ef4444]">{error || "Invitación inválida o expirada."}</p>
              </div>
              <div className="mt-4">
                <Link href="/login" className="inline-block rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] px-4 py-2.5 font-semibold text-white">Ir al login</Link>
              </div>
            </div>
          )}

          {status === "valid" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Email</label>
                <input
                  type="email"
                  value={email || ""}
                  disabled
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Contraseña</label>
                <input
                  type="password"
                  placeholder="Al menos 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)]"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Confirmar contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)]"
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3">
                  <p className="text-sm text-[#ef4444]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] px-4 py-2.5 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">RadarBallena Dashboard © 2026</p>
      </div>
    </div>
  );
}
