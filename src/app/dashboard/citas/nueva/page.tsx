"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, AlertCircle } from "lucide-react";

interface Paciente { id: string; nombre: string; apellidos: string; }
interface Medico   { id: string; nombre: string; apellidos?: string; titulo?: string; especialidad?: string; }

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent";

export default function NuevaCitaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos]     = useState<Medico[]>([]);

  useEffect(() => {
    fetch("/api/pacientes").then((r) => r.json()).then((d) => setPacientes(Array.isArray(d) ? d : []));
    fetch("/api/usuarios?rol=MEDICO").then((r) => r.json()).then((d) => setMedicos(Array.isArray(d) ? d : []));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      pacienteId: (form.elements.namedItem("pacienteId") as HTMLSelectElement).value,
      medicoId:   (form.elements.namedItem("medicoId")   as HTMLSelectElement).value,
      fecha:      (form.elements.namedItem("fecha")      as HTMLInputElement).value,
      motivo:     (form.elements.namedItem("motivo")     as HTMLInputElement).value,
      notas:      (form.elements.namedItem("notas")      as HTMLTextAreaElement).value,
    };

    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/dashboard/citas");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Error al programar la cita. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.push("/dashboard/citas")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} /> Citas
        </button>
        <div className="flex items-center gap-2">
          <CalendarPlus size={18} className="text-slate-400" />
          <h1 className="text-lg font-bold text-slate-900">Nueva cita</h1>
        </div>
        <div className="w-24" />
      </header>

      {/* Form */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">
                Datos de la cita
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Paciente *</label>
                <select name="pacienteId" required className={inputClass}>
                  <option value="">Seleccionar paciente…</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médico *</label>
                <select name="medicoId" required className={inputClass}>
                  <option value="">Seleccionar médico…</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titulo ? `${m.titulo} ` : ""}{m.nombre} {m.apellidos ?? ""}{m.especialidad ? ` — ${m.especialidad}` : ""}
                    </option>
                  ))}
                </select>
                {medicos.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No hay médicos activos registrados en el sistema.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha y hora *</label>
                <input
                  name="fecha"
                  type="datetime-local"
                  required
                  className={inputClass}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motivo</label>
                <input
                  name="motivo"
                  className={inputClass}
                  placeholder="Ej: Consulta general, revisión de resultados…"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notas adicionales</label>
                <textarea
                  name="notas"
                  rows={3}
                  className={inputClass + " resize-none"}
                  placeholder="Indicaciones previas, observaciones…"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl ring-1 ring-red-200">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                <CalendarPlus size={15} />
                {loading ? "Guardando…" : "Programar cita"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/citas")}
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
