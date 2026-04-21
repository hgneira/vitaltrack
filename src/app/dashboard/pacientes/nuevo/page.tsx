"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow";

export default function NuevoPacientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value,
      apellidos: (form.elements.namedItem("apellidos") as HTMLInputElement).value,
      fechaNacimiento: (form.elements.namedItem("fechaNacimiento") as HTMLInputElement).value,
      sexo: (form.elements.namedItem("sexo") as HTMLSelectElement).value,
      telefono: (form.elements.namedItem("telefono") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      direccion: (form.elements.namedItem("direccion") as HTMLInputElement).value,
      alergias: (form.elements.namedItem("alergias") as HTMLTextAreaElement).value,
      antecedentes: (form.elements.namedItem("antecedentes") as HTMLTextAreaElement).value,
      contactoEmergencia: (form.elements.namedItem("contactoEmergencia") as HTMLInputElement).value,
      telefonoEmergencia: (form.elements.namedItem("telefonoEmergencia") as HTMLInputElement).value,
    };

    const res = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/dashboard/pacientes");
    } else {
      setError("Error al registrar paciente. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.push("/dashboard/pacientes")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Pacientes
        </button>
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-slate-400" />
          <h1 className="text-lg font-bold text-slate-900">Nuevo paciente</h1>
        </div>
        <div className="w-24" />
      </header>

      {/* Form */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal info */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                Datos personales
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required>
                  <input name="nombre" required className={inputClass} placeholder="Juan" />
                </Field>
                <Field label="Apellidos" required>
                  <input name="apellidos" required className={inputClass} placeholder="García López" />
                </Field>
                <Field label="Fecha de nacimiento" required>
                  <input name="fechaNacimiento" type="date" required className={inputClass} />
                </Field>
                <Field label="Sexo" required>
                  <select name="sexo" required className={inputClass}>
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                Contacto
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <input name="telefono" type="tel" className={inputClass} placeholder="+52 55 1234 5678" />
                </Field>
                <Field label="Correo electrónico">
                  <input name="email" type="email" className={inputClass} placeholder="paciente@correo.com" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Dirección">
                  <input name="direccion" className={inputClass} placeholder="Calle, número, colonia, ciudad" />
                </Field>
              </div>
            </div>

            {/* Medical info */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                Información médica
              </h2>
              <div className="space-y-4">
                <Field label="Alergias">
                  <textarea
                    name="alergias"
                    rows={2}
                    className={inputClass}
                    placeholder="Penicilina, látex, etc."
                  />
                </Field>
                <Field label="Antecedentes médicos">
                  <textarea
                    name="antecedentes"
                    rows={3}
                    className={inputClass}
                    placeholder="Enfermedades previas, cirugías, tratamientos…"
                  />
                </Field>
              </div>
            </div>

            {/* Emergency contact */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                Contacto de emergencia
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre">
                  <input name="contactoEmergencia" className={inputClass} placeholder="María García" />
                </Field>
                <Field label="Teléfono">
                  <input name="telefonoEmergencia" type="tel" className={inputClass} placeholder="+52 55 9876 5432" />
                </Field>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg ring-1 ring-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                <UserPlus size={15} />
                {loading ? "Guardando..." : "Registrar paciente"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/pacientes")}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
