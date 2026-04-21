"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  User, Mail, Phone, Stethoscope, GraduationCap, BadgeCheck,
  Camera, Save, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";

interface Perfil {
  id: string; nombre: string; apellidos: string; titulo?: string; email: string;
  especialidad?: string; subespecialidad?: string; telefono?: string; escuela?: string;
  cedulaProfesional?: string; foto?: string; rol: string;
}

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [perfil, setPerfil]   = useState<Perfil | null>(null);
  const [form,   setForm]     = useState<Partial<Perfil>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [status,  setStatus]  = useState<"idle" | "ok" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => {
        if (d.id) { setPerfil(d); setForm(d); setPreview(d.foto ?? null); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setForm((f) => ({ ...f, foto: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setPerfil(updated);
        await update();
        setStatus("ok");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!perfil) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-500">No se pudo cargar el perfil</p>
    </div>
  );

  const initials = `${perfil.nombre[0] ?? ""}${perfil.apellidos?.[0] ?? ""}`.toUpperCase();
  const showProfessional = ["MEDICO", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(perfil.rol);

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <User size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Mi Perfil</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Guardar cambios
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Status banner */}
          {status === "ok" && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 text-sm">
              <CheckCircle size={16} /> Perfil actualizado correctamente
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              <AlertCircle size={16} /> Ocurrió un error al guardar
            </div>
          )}

          {/* Photo card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Foto de perfil</h2>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
                  {preview
                    ? <img src={preview} alt="Foto" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Camera size={14} className="text-slate-600" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{perfil.nombre} {perfil.apellidos ?? ""}</p>
                <p className="text-xs text-slate-500 mt-0.5">{perfil.email}</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Cambiar foto
                </button>
                {preview && (
                  <button
                    onClick={() => { setPreview(null); setForm((f) => ({ ...f, foto: undefined })); }}
                    className="mt-2 ml-3 text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Información personal</h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                <select
                  value={form.titulo ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">—</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Dra.">Dra.</option>
                  <option value="Lic.">Lic.</option>
                  <option value="Ing.">Ing.</option>
                  <option value="Enf.">Enf.</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.nombre ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Apellidos</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.apellidos ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={perfil.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">El correo no puede modificarse</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono de contacto</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="10 dígitos"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Professional info — only for médicos y biomédicos */}
          {showProfessional && <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Información profesional</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Especialidad</label>
                <div className="relative">
                  <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.especialidad ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                    placeholder="Ej. Cardiología"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subespecialidad</label>
                <div className="relative">
                  <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.subespecialidad ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, subespecialidad: e.target.value }))}
                    placeholder="Ej. Electrofisiología"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Escuela / Universidad</label>
              <div className="relative">
                <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.escuela ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, escuela: e.target.value }))}
                  placeholder="Ej. Universidad Nacional Autónoma de México"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cédula profesional</label>
              <div className="relative">
                <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.cedulaProfesional ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cedulaProfesional: e.target.value }))}
                  placeholder="Ej. MED-1234567"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>}

        </div>
      </div>
    </div>
  );
}
