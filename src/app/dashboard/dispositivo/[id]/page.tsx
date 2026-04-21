"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity, MapPin, CheckCircle, Wrench, AlertTriangle,
  ArrowLeft, Package, ArrowRightLeft, RotateCcw, Flag,
  User, Clock, ChevronDown, Loader2,
} from "lucide-react";
import Link from "next/link";

interface AccionUser { nombre: string; apellidos?: string; rol: string; }
interface Accion {
  id: string; tipo: string; area?: string; notas?: string;
  createdAt: string; user: AccionUser;
}
interface Equipo {
  id: string; nombre: string; marca?: string; modelo?: string;
  numeroSerie?: string; ubicacion?: string; estado: string; descripcion?: string;
  acciones: Accion[];
}

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "text-amber-700",  bg: "bg-amber-100",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "text-red-700",    bg: "bg-red-100",    icon: AlertTriangle },
};

const ACCION_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  TOMAR:             { label: "Tomó el equipo",       icon: Package,          color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  MOVER:             { label: "Movió de área",         icon: ArrowRightLeft,   color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  DEVOLVER:          { label: "Devolvió el equipo",    icon: RotateCcw,        color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
  REPORTAR_PROBLEMA: { label: "Reportó un problema",   icon: Flag,             color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
};

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Admin", MEDICO: "Médico", ENFERMERIA: "Enfermería",
  INGENIERIA_BIOMEDICA: "Ing. Biomédica", JEFE_BIOMEDICA: "Jefe Biomédica",
  RECEPCION: "Recepción", LIMPIEZA: "Limpieza", MANTENIMIENTO: "Mantenimiento",
  FARMACIA: "Farmacia", URGENCIAS: "Urgencias",
};

type ActionType = "TOMAR" | "MOVER" | "DEVOLVER" | "REPORTAR_PROBLEMA";

const ACCIONES: { tipo: ActionType; label: string; desc: string; icon: React.ElementType; color: string; nuevoEstado?: string }[] = [
  { tipo: "TOMAR",             label: "Tomar equipo",    desc: "Registrar que estás usando este dispositivo",      icon: Package,        color: "bg-blue-600 hover:bg-blue-700" },
  { tipo: "MOVER",             label: "Mover de área",   desc: "Cambiar la ubicación del dispositivo",             icon: ArrowRightLeft, color: "bg-violet-600 hover:bg-violet-700" },
  { tipo: "DEVOLVER",          label: "Devolver",        desc: "El dispositivo regresa a su lugar",                icon: RotateCcw,      color: "bg-emerald-600 hover:bg-emerald-700" },
  { tipo: "REPORTAR_PROBLEMA", label: "Reportar problema", desc: "Informar un fallo o incidencia",                 icon: Flag,           color: "bg-red-600 hover:bg-red-700", nuevoEstado: "FUERA_DE_SERVICIO" },
];

export default function DispositivoPage() {
  const { id } = useParams<{ id: string }>();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionActiva, setAccionActiva] = useState<ActionType | null>(null);
  const [area, setArea] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    const data = await fetch(`/api/dispositivo/${id}`).then((r) => r.json());
    setEquipo(data.error ? null : data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const handleAccion = async () => {
    if (!accionActiva) return;
    setSaving(true); setSaveError("");
    const accionDef = ACCIONES.find((a) => a.tipo === accionActiva)!;
    const body: Record<string, unknown> = { tipo: accionActiva };
    if (accionActiva === "MOVER") body.area = area;
    if (notas) body.notas = notas;
    if (accionDef.nuevoEstado) body.nuevoEstado = accionDef.nuevoEstado;

    const res = await fetch(`/api/dispositivo/${id}/acciones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setAccionActiva(null); setArea(""); setNotas("");
      await load();
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Error al registrar");
    }
    setSaving(false);
  };

  const openAccion = (tipo: ActionType) => {
    setAccionActiva(tipo);
    setArea("");
    setNotas("");
    setSaveError("");
  };

  const closeSheet = () => {
    setAccionActiva(null);
    setArea("");
    setNotas("");
    setSaveError("");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={28} className="animate-spin text-slate-400" />
    </div>
  );

  if (!equipo) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-8">
      <AlertTriangle size={40} className="text-red-400" />
      <p className="text-slate-600 font-medium">Dispositivo no encontrado</p>
      <Link href="/dashboard" className="text-sm text-blue-600 underline">Volver al inicio</Link>
    </div>
  );

  const estadoCfg = ESTADO_CFG[equipo.estado] ?? ESTADO_CFG.ACTIVO;
  const EstadoIcon = estadoCfg.icon;
  const accionDef = accionActiva ? ACCIONES.find((a) => a.tipo === accionActiva) : null;

  const confirmDisabled =
    saving ||
    (accionActiva === "MOVER" && !area.trim()) ||
    (accionActiva === "REPORTAR_PROBLEMA" && !notas.trim());

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/urgencias/inventario" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Dispositivo</p>
            <p className="text-sm font-bold text-slate-900 truncate">{equipo.nombre}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${estadoCfg.bg} ${estadoCfg.color}`}>
            <EstadoIcon size={11} />{estadoCfg.label}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Device info card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Activity size={22} className="text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight">{equipo.nombre}</h1>
              {(equipo.marca || equipo.modelo) && (
                <p className="text-sm text-slate-500 mt-0.5">{[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}</p>
              )}
              {equipo.numeroSerie && (
                <p className="text-xs font-mono text-slate-400 mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded">{equipo.numeroSerie}</p>
              )}
            </div>
          </div>

          {equipo.ubicacion && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span>{equipo.ubicacion}</span>
            </div>
          )}

          {equipo.descripcion && (
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">{equipo.descripcion}</p>
          )}
        </div>

        {/* Action buttons */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Registrar acción</p>
          <div className="grid grid-cols-2 gap-3">
            {ACCIONES.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.tipo}
                  onClick={() => openAccion(a.tipo)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl text-white transition-all ${a.color} shadow-sm active:scale-95`}
                >
                  <Icon size={22} />
                  <span className="text-sm font-semibold">{a.label}</span>
                  <span className="text-xs opacity-75 text-center leading-tight">{a.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <button onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <span className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              Historial de acciones
              {equipo.acciones.length > 0 && (
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">{equipo.acciones.length}</span>
              )}
            </span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>

          {showHistory && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {equipo.acciones.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin acciones registradas</p>
              ) : (
                equipo.acciones.map((accion) => {
                  const cfg = ACCION_CFG[accion.tipo] ?? ACCION_CFG.TOMAR;
                  const Icon = cfg.icon;
                  return (
                    <div key={accion.id} className={`flex items-start gap-3 px-5 py-3.5 ${cfg.bg} border-l-4 ${cfg.border}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon size={13} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-xs text-slate-400 shrink-0">
                            {new Date(accion.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <User size={10} className="text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {accion.user.nombre} {accion.user.apellidos ?? ""} · {ROL_LABELS[accion.user.rol] ?? accion.user.rol}
                          </p>
                        </div>
                        {accion.area && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={9} />{accion.area}
                          </p>
                        )}
                        {accion.notas && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{accion.notas}"</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet confirmation modal */}
      {accionActiva && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-w-lg mx-auto">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Title */}
            <div className="flex items-center gap-3 mb-5">
              {accionDef && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  accionDef.tipo === "TOMAR" ? "bg-blue-100" :
                  accionDef.tipo === "MOVER" ? "bg-violet-100" :
                  accionDef.tipo === "DEVOLVER" ? "bg-emerald-100" :
                  "bg-red-100"
                }`}>
                  <accionDef.icon size={18} className={
                    accionDef.tipo === "TOMAR" ? "text-blue-600" :
                    accionDef.tipo === "MOVER" ? "text-violet-600" :
                    accionDef.tipo === "DEVOLVER" ? "text-emerald-600" :
                    "text-red-600"
                  } />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 text-base">{accionDef?.label}</p>
                <p className="text-xs text-slate-400">{equipo.nombre}</p>
              </div>
            </div>

            {/* Fields */}
            {accionActiva === "MOVER" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nueva área / ubicación *</label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ej. Sala de Choque"
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}

            {(accionActiva === "REPORTAR_PROBLEMA" || accionActiva === "MOVER") && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {accionActiva === "REPORTAR_PROBLEMA" ? "Descripción del problema *" : "Notas (opcional)"}
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  autoFocus={accionActiva === "REPORTAR_PROBLEMA"}
                  placeholder={accionActiva === "REPORTAR_PROBLEMA" ? "Describe el problema encontrado…" : "Notas adicionales…"}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            )}

            {accionActiva === "TOMAR" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            )}

            {accionActiva === "DEVOLVER" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            )}

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAccion}
                disabled={confirmDisabled}
                className={`flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                  accionDef?.color ?? "bg-slate-600"
                }`}
              >
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Confirmar"}
              </button>
              <button
                onClick={closeSheet}
                className="px-5 py-3.5 rounded-xl text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
