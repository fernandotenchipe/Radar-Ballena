import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Registro - RadarBallena",
  description: "El registro solo está disponible mediante invitación",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="login-logo-wrapper">
            <Image src="/radarballena-logo.png" alt="RadarBallena" width={220} height={50} priority className="login-logo-image h-auto w-auto" />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Registro solo por invitación</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">El registro solo está disponible mediante invitación. Si ya pagaste, revisa tu correo de acceso.</p>
          </div>

          <div className="mt-4">
            <Link href="/login" className="inline-block rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] px-4 py-2.5 font-semibold text-white">Ir a login</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">RadarBallena Dashboard © 2026</p>
      </div>
    </div>
  );
}