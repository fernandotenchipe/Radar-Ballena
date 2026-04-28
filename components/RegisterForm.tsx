"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MIN_PASSWORD_LEN = 8;

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

      if (password.length < MIN_PASSWORD_LEN) {
        setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LEN} caracteres`);
        return;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
      }

    setIsLoading(true);

    try {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL no está configurada");
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear la cuenta");
      }

      setSuccess("Cuenta creada. Ahora puedes iniciar sesión.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Crear cuenta
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Regístrate para acceder al dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 transition-colors focus:border-[#06b6d4]/50 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/20"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LEN}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 transition-colors focus:border-[#06b6d4]/50 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/20"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Mínimo {MIN_PASSWORD_LEN} caracteres.</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={MIN_PASSWORD_LEN}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 transition-colors focus:border-[#06b6d4]/50 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/20"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-3">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:from-[#06b6d4]/90 hover:to-[#3b82f6]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Creando cuenta..." : "Registrarme"}
            </button>
          </form>

          <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#06b6d4] transition-colors hover:text-[#38bdf8]"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}