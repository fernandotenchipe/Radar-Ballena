import React from "react";
import CreateAccountWithInviteForm from "@/components/CreateAccountWithInviteForm";

export const metadata = {
  title: "Crear cuenta - RadarBallena",
  description: "Crea tu cuenta con tu invitación de RadarBallena",
};

export default function CrearCuentaPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Validando...</div>}>
      <CreateAccountWithInviteForm />
    </React.Suspense>
  );
}
