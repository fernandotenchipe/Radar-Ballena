"use client";

import { useState } from "react";
import { useAuth } from "./AuthContext";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/radarballena-logo.png"
            alt="RadarBallena"
            width={220}
            height={50}
            priority
            className="h-auto w-auto"
          />
        </div>

        {/* Card de login */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Bienvenido
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Accede a tu dashboard de whale alerts
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
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

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 transition-colors focus:border-[#06b6d4]/50 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/20"
                disabled={isLoading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:from-[#06b6d4]/90 hover:to-[#3b82f6]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Demo info */}
          <div className="mt-6 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 p-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[#06b6d4]">Prueba:</span> Usa cualquier email y contraseña
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
          RadarBallena Dashboard © 2026
        </p>
      </div>
    </div>
  );
}
