"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users, ClipboardList, Plus, X, AlertTriangle, Trash2,
  Phone, Mail, CheckCircle, Clock, RefreshCw, XCircle,
  ChevronLeft, ChevronRight, ArrowLeft, Wrench, CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Biomedico {
  id: string; nombre: string; apellidos?: string;
  email: string; telefono?: string;
}

interface Equipo {
  id: string; nombre: string; ubicacion?: string;
}

interface Tarea {
  id: string; fecha: string; estado: string; tipo: string;
  descripcion?: string; recurrencia?: string;
  equipo: { id: string; nombre: string; ubicacion?: string };
  asignadoA?: { id: string; nombre: string; apellidos?: string };
  asignadoPor: { nombre: string; apellidos?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: "Pendiente",  badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       icon: Clock },
  EN_PROCESO: { label: "En proceso", badge: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",          icon: RefreshCw },
  COMPLETADO: { label: "Completado", badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", icon: CheckCircle },
  CANCELADO:  { label: "Cancelado",  badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",       icon: XCircle },
};

const TIPO_CFG: Record<string, { label: string; color: string }> = {
  PREVENTIVO: { label: "Preventivo", color: "bg-blue-100 text-blue-700" },
  CORRECTIVO: { label: "Correctivo", color: "bg-orange-100 text-orange-700" },
  INSPECCION: { label: "Inspección", color: "bg-violet-100 text-violet-700" },
};

const RECURRENCIA_LABELS: Record<string, string> = {
  MENSUAL: "Mensual", TRIMESTRAL: "Cada 3 meses", SEMESTRAL: "Cada 6 meses", ANUAL: "Anual",
};

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent";

const emptyAsignForm = {
  equipoId: "", asignadoAId: "",
  fecha: new Date().toISOString().slice(0, 10),
  tipo: "PREVENTIVO", recurrencia: "", descripcion: "",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function EquipoBiomedicaPage() {
  const [biomedicos,    setBiomedicos]    = useState<Biomedico[]>([]);
  const [equipos,       setEquipos]       = useState<Equipo[]>([]);
  const [tareas,        setTareas]        = useState<Tarea[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<Biomedico | null>(null);

  // Assign task modal
  const [showModal, setShowModal] = useState(false);
  const [asignForm, setAsignForm] = useState(emptyAsignForm);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = async () => {
    const [biomData, equiposData, tareasData] = await Promise.all([
      fetch("/api/usuarios?rol=INGENIERIA_BIOMEDICA").then((r) => r.json()),
      fetch("/api/equipos").then((r) => r.json()),
      fetch("/api/tareas-mantenimiento").then((r) => r.json()),
    ]);
    setBiomedicos(Array.isArray(biomData) ? biomData : []);
    setEquipos(Array.isArray(equiposData) ? equiposData : []);
    setTareas(Array.isArray(tareasData) ? tareasData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Stats per biomedico
  const statsByBiomedico = useMemo(() => {
    const map: Record<string, { total: number; pendiente: number; completado: number }> = {};
    tareas.forEach((t) => {
      if (!t.asignadoA) return;
      const id = t.asignadoA.id;
      if (!map[id]) map[id] = { total: 0, pendiente: 0, completado: 0 };
      map[id].total++;
      if (t.estado === "PENDIENTE" || t.estado === "EN_PROCESO") map[id].pendiente++;
      if (t.estado === "COMPLETADO") map[id].completado++;
    });
    return map;
  }, [tareas]);

  // Tasks of selected employee
  const tareasDelEmpleado = useMemo(() =>
    selected ? tareas.filter((t) => t.asignadoA?.id === selected.id) : [],
    [tareas, selected]
  );

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    const res = await fetch("/api/tareas-mantenimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...asignForm, recurrencia: asignForm.recurrencia || null }),
    });
    if (res.ok) { await load(); setShowModal(false); setAsignForm(emptyAsignForm); }
    else { const d = await res.json(); setFormError(d.error ?? "Error al asignar tarea"); }
    setSaving(false);
  };

  const handleEstadoChange = async (tarea: Tarea, estado: string) => {
    await fetch(`/api/tareas-mantenimiento/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/tareas-mantenimiento/${deleteTarget.id}`, { method: "DELETE" });
    await load();
    setDeleteTarget(null);
    setDeleting(false);
  };

  const openAssignForEmployee = (b: Biomedico) => {
    setAsignForm({ ...emptyAsignForm, asignadoAId: b.id });
    setFormError("");
    setShowModal(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mr-1"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <Users size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">
            {selected ? `${selected.nombre} ${selected.apellidos ?? ""}` : "Equipo Biomédica"}
          </h1>
          {selected && (
            <span className="text-sm text-slate-400 font-normal">— Tareas programadas</span>
          )}
        </div>
        {selected && (
          <button
            onClick={() => openAssignForEmployee(selected)}
            className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus size={15} /> Asignar tarea
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">

        {/* ── LISTA DE EMPLEADOS ─────────────────────────────────────────────── */}
        {!selected && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : biomedicos.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-12 text-center">
                <Users size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No hay biomédicos registrados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {biomedicos.map((b) => {
                  const stats = statsByBiomedico[b.id] ?? { total: 0, pendiente: 0, completado: 0 };
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 text-left hover:ring-cyan-300 hover:shadow-md transition-all group"
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
                          {b.nombre[0]}{b.apellidos?.[0] ?? ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{b.nombre} {b.apellidos ?? ""}</p>
                          <p className="text-xs text-slate-500 truncate">{b.email}</p>
                          {b.telefono && (
                            <p className="text-xs text-slate-400 mt-0.5">{b.telefono}</p>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 rounded-xl px-3 py-2 text-center ring-1 ring-slate-100">
                          <p className="text-lg font-bold text-slate-900">{stats.total}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">Total</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center ring-1 ring-amber-100">
                          <p className="text-lg font-bold text-amber-700">{stats.pendiente}</p>
                          <p className="text-[10px] text-amber-600 leading-tight">Pendientes</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl px-3 py-2 text-center ring-1 ring-emerald-100">
                          <p className="text-lg font-bold text-emerald-700">{stats.completado}</p>
                          <p className="text-[10px] text-emerald-600 leading-tight">Completadas</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end">
                        <span className="text-xs text-cyan-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Ver tareas <ChevronRight size={13} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAREAS DEL EMPLEADO ────────────────────────────────────────────── */}
        {selected && (
          <>
            {/* Employee summary bar */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 flex items-center gap-5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
                {selected.nombre[0]}{selected.apellidos?.[0] ?? ""}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{selected.nombre} {selected.apellidos ?? ""}</p>
                <div className="flex items-center gap-4 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={11} />{selected.email}</span>
                  {selected.telefono && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} />{selected.telefono}</span>}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                {[
                  { label: "Total",       val: tareasDelEmpleado.length,                                                            bg: "bg-slate-50  ring-slate-200",   text: "text-slate-900" },
                  { label: "Pendientes",  val: tareasDelEmpleado.filter(t => t.estado === "PENDIENTE" || t.estado === "EN_PROCESO").length, bg: "bg-amber-50  ring-amber-200",   text: "text-amber-700" },
                  { label: "Completadas", val: tareasDelEmpleado.filter(t => t.estado === "COMPLETADO").length,                     bg: "bg-emerald-50 ring-emerald-200", text: "text-emerald-700" },
                ].map(({ label, val, bg, text }) => (
                  <div key={label} className={`text-center px-4 py-2 rounded-xl ring-1 ${bg}`}>
                    <p className={`text-xl font-bold ${text}`}>{val}</p>
                    <p className="text-[10px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {tareasDelEmpleado.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-12 text-center">
                <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No hay tareas asignadas a este empleado</p>
                <button
                  onClick={() => openAssignForEmployee(selected)}
                  className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700"
                >
                  Asignar primera tarea
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tareasDelEmpleado
                  .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                  .map((t) => {
                    const estadoCfg = ESTADO_CFG[t.estado] ?? { label: t.estado, badge: "bg-slate-100 text-slate-600", icon: Clock };
                    const EstadoIcon = estadoCfg.icon;
                    const tipoCfg = TIPO_CFG[t.tipo] ?? { label: t.tipo, color: "bg-slate-100 text-slate-600" };
                    const isOverdue = t.estado === "PENDIENTE" && new Date(t.fecha) < new Date();

                    return (
                      <div key={t.id} className={`bg-white rounded-2xl ring-1 ${isOverdue ? "ring-red-200" : "ring-slate-200"} p-5 flex items-start gap-4 group hover:shadow-sm transition-all`}>
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tipoCfg.color}`}>
                          <Wrench size={16} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{t.equipo.nombre}</p>
                            {t.equipo.ubicacion && (
                              <span className="text-xs text-slate-400">{t.equipo.ubicacion}</span>
                            )}
                            {isOverdue && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Vencida</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <CalendarDays size={11} />
                              {new Date(t.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tipoCfg.color}`}>{tipoCfg.label}</span>
                            {t.recurrencia && (
                              <span className="text-xs text-slate-400">{RECURRENCIA_LABELS[t.recurrencia] ?? t.recurrencia}</span>
                            )}
                          </div>
                          {t.descripcion && (
                            <p className="text-xs text-slate-400 mt-1 truncate">{t.descripcion}</p>
                          )}
                        </div>

                        {/* Estado selector */}
                        <select
                          value={t.estado}
                          onChange={(e) => handleEstadoChange(t, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 shrink-0 ${estadoCfg.badge}`}
                        >
                          {Object.entries(ESTADO_CFG).map(([val, c]) => (
                            <option key={val} value={val}>{c.label}</option>
                          ))}
                        </select>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Assign task modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Asignar tarea de mantenimiento</h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleAsignar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Equipo *</label>
                <select required value={asignForm.equipoId} onChange={(e) => setAsignForm({ ...asignForm, equipoId: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar equipo…</option>
                  {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}{eq.ubicacion ? ` — ${eq.ubicacion}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Asignar a</label>
                <select value={asignForm.asignadoAId} onChange={(e) => setAsignForm({ ...asignForm, asignadoAId: e.target.value })} className={inputClass}>
                  <option value="">Sin asignar</option>
                  {biomedicos.map((b) => <option key={b.id} value={b.id}>{b.nombre} {b.apellidos ?? ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input required type="date" value={asignForm.fecha} onChange={(e) => setAsignForm({ ...asignForm, fecha: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={asignForm.tipo} onChange={(e) => setAsignForm({ ...asignForm, tipo: e.target.value })} className={inputClass}>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="INSPECCION">Inspección</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Recurrencia</label>
                <select value={asignForm.recurrencia} onChange={(e) => setAsignForm({ ...asignForm, recurrencia: e.target.value })} className={inputClass}>
                  <option value="">Sin recurrencia</option>
                  <option value="MENSUAL">Mensual</option>
                  <option value="TRIMESTRAL">Cada 3 meses</option>
                  <option value="SEMESTRAL">Cada 6 meses</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={asignForm.descripcion} onChange={(e) => setAsignForm({ ...asignForm, descripcion: e.target.value })} rows={3} className={inputClass + " resize-none"} placeholder="Descripción de la tarea…" />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Asignar tarea"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar tarea</h2>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 mb-5">
              Se eliminará la tarea de <span className="font-semibold">{deleteTarget.equipo.nombre}</span>{" "}
              del {new Date(deleteTarget.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
