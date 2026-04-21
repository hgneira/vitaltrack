"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Stethoscope, Plus, Search, ArrowRight, Wrench, CheckCircle, AlertTriangle,
  List, Calendar, ChevronLeft, ChevronRight, Pencil, X, Trash2,
  Clock, RefreshCw, XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Equipo {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaAdquisicion?: string;
  ubicacion?: string;
  estado: string;
  descripcion?: string;
  mantenimientos: { fecha: string; tipo: string }[];
  _count: { mantenimientos: number };
}

interface TareaCalendar {
  id: string;
  fecha: string;
  estado: string;
  tipo: string;
  descripcion?: string;
  recurrencia?: string;
  equipo: { id: string; nombre: string; ubicacion?: string };
  asignadoA?: { id: string; nombre: string; apellidos?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",      icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600 ring-1 ring-red-200",            icon: AlertTriangle },
};

const TAREA_ESTADO_CFG: Record<string, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: "Pendiente",  badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",      dot: "bg-amber-400",   icon: Clock },
  EN_PROCESO: { label: "En proceso", badge: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",         dot: "bg-cyan-500",    icon: RefreshCw },
  COMPLETADO: { label: "Completado", badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  CANCELADO:  { label: "Cancelado",  badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",      dot: "bg-slate-400",   icon: XCircle },
};

const DIAS  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const emptyEquipoForm = { nombre: "", marca: "", modelo: "", numeroSerie: "", fechaAdquisicion: "", ubicacion: "", estado: "ACTIVO", descripcion: "" };

type ViewType = "inventario" | "calendario";

// ─── Main component ───────────────────────────────────────────────────────────

export default function BiomedicaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.rol ?? "";

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tareas,  setTareas]  = useState<TareaCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [view,    setView]    = useState<ViewType>("inventario");

  // New equipment form
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(emptyEquipoForm);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // Edit equipment
  const [editEquipo, setEditEquipo] = useState<Equipo | null>(null);
  const [editForm,   setEditForm]   = useState(emptyEquipoForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  // Calendar navigation
  const [calYear,     setCalYear]     = useState(() => new Date().getFullYear());
  const [calMonth,    setCalMonth]    = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit task (JEFE only)
  const [editTarea,      setEditTarea]      = useState<TareaCalendar | null>(null);
  const [editTareaForm,  setEditTareaForm]  = useState({ estado: "", descripcion: "" });
  const [editTareaSaving,setEditTareaSaving]= useState(false);

  // Delete task
  const [deleteTarea,  setDeleteTarea]  = useState<TareaCalendar | null>(null);
  const [deletingTarea,setDeletingTarea]= useState(false);

  const isJefe  = userRole === "JEFE_BIOMEDICA";
  const isAdmin = userRole === "ADMINISTRADOR";

  const load = async () => {
    const [equiposData, tareasData] = await Promise.all([
      fetch("/api/equipos").then((r) => r.json()),
      fetch("/api/tareas-mantenimiento").then((r) => r.json()),
    ]);
    setEquipos(Array.isArray(equiposData) ? equiposData : []);
    setTareas(Array.isArray(tareasData) ? tareasData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = equipos.filter((e) => {
    const q = search.toLowerCase();
    return e.nombre.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q) || (e.numeroSerie ?? "").toLowerCase().includes(q);
  });

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/equipos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { await load(); setShowForm(false); setForm(emptyEquipoForm); }
    else { const d = await res.json(); setError(d.error ?? "Error al guardar"); }
    setSaving(false);
  };

  const openEditEquipo = (eq: Equipo) => {
    setEditEquipo(eq); setEditError("");
    setEditForm({
      nombre: eq.nombre, marca: eq.marca ?? "", modelo: eq.modelo ?? "",
      numeroSerie: eq.numeroSerie ?? "",
      fechaAdquisicion: eq.fechaAdquisicion ? new Date(eq.fechaAdquisicion).toISOString().slice(0, 10) : "",
      ubicacion: eq.ubicacion ?? "", estado: eq.estado, descripcion: eq.descripcion ?? "",
    });
  };

  const handleEditSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editEquipo) return;
    setEditSaving(true); setEditError("");
    const res = await fetch(`/api/equipos/${editEquipo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    if (res.ok) { await load(); setEditEquipo(null); }
    else { const d = await res.json(); setEditError(d.error ?? "Error al guardar"); }
    setEditSaving(false);
  };

  const openEditTarea = (t: TareaCalendar) => {
    setEditTarea(t);
    setEditTareaForm({ estado: t.estado, descripcion: t.descripcion ?? "" });
  };

  const handleEditTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarea) return;
    setEditTareaSaving(true);
    await fetch(`/api/tareas-mantenimiento/${editTarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editTareaForm),
    });
    await load();
    setEditTarea(null);
    setEditTareaSaving(false);
  };

  const handleDeleteTarea = async () => {
    if (!deleteTarea) return;
    setDeletingTarea(true);
    await fetch(`/api/tareas-mantenimiento/${deleteTarea.id}`, { method: "DELETE" });
    await load();
    setDeleteTarea(null);
    setDeletingTarea(false);
  };

  const stats = {
    total: equipos.length,
    activo: equipos.filter((e) => e.estado === "ACTIVO").length,
    mantenimiento: equipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length,
    fueraServicio: equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length,
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const tareasByDay = useMemo(() => {
    const map: Record<string, TareaCalendar[]> = {};
    tareas.forEach((t) => {
      const key = new Date(t.fecha).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tareas]);

  const dayKey = (d: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const tareasDelDia = selectedDay ? (tareasByDay[selectedDay] ?? []) : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Equipo Médico</h1>
          {!loading && <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{equipos.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("inventario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "inventario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <List size={14} /> Inventario
            </button>
            <button
              onClick={() => setView("calendario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "calendario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Calendar size={14} /> Calendario
            </button>
          </div>
          {(isJefe || isAdmin) && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
              <Plus size={15} /> Nuevo equipo
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">

        {/* ── INVENTARIO ─────────────────────────────────────────────────────── */}
        {view === "inventario" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total",             value: stats.total,         color: "text-slate-700",  bg: "bg-slate-50" },
                { label: "Activos",           value: stats.activo,        color: "text-emerald-700", bg: "bg-emerald-50" },
                { label: "En mantenimiento",  value: stats.mantenimiento, color: "text-amber-700",  bg: "bg-amber-50" },
                { label: "Fuera de servicio", value: stats.fueraServicio, color: "text-red-600",    bg: "bg-red-50" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ring-slate-200`}>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, ubicación o N° serie…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Serie</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mantenimientos</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((eq) => {
                      const cfg = ESTADO_CONFIG[eq.estado] ?? { label: eq.estado, color: "bg-slate-100 text-slate-600", icon: Stethoscope };
                      const Icon = cfg.icon;
                      return (
                        <tr key={eq.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <Stethoscope size={16} className="text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{eq.nombre}</p>
                                {(eq.marca || eq.modelo) && <p className="text-xs text-slate-500">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{eq.numeroSerie || "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{eq.ubicacion || "—"}</td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${cfg.color}`}>
                              <Icon size={11} />{cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{eq._count.mantenimientos}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(isJefe || isAdmin) && (
                                <button onClick={() => openEditEquipo(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                                  <Pencil size={14} />
                                </button>
                              )}
                              <button onClick={() => router.push(`/dashboard/biomedica/${eq.id}`)}
                                className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                                Ver detalle <ArrowRight size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-12 text-center">
                    <Stethoscope size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay equipos registrados</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CALENDARIO ─────────────────────────────────────────────────────── */}
        {view === "calendario" && (
          <div className="flex gap-6 h-full">
            {/* Calendar grid */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /></button>
                  <h2 className="font-semibold text-slate-900">{MESES[calMonth]} {calYear}</h2>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight size={16} /></button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {DIAS.map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 last:border-r-0 bg-slate-50/50" />;

                    const key = dayKey(day);
                    const dayTareas = tareasByDay[key] ?? [];
                    const isToday = key === today;
                    const isSelected = key === selectedDay;

                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedDay(isSelected ? null : key)}
                        className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors
                          ${isSelected ? "bg-cyan-50 ring-1 ring-inset ring-cyan-300" : "hover:bg-slate-50"}
                          ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                      >
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? "bg-cyan-600 text-white" : "text-slate-700"}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayTareas.slice(0, 2).map((t) => {
                            const dot = TAREA_ESTADO_CFG[t.estado]?.dot ?? "bg-slate-400";
                            return (
                              <div key={t.id} className="flex items-center gap-1 text-[10px] text-slate-700 bg-white rounded px-1 py-0.5 ring-1 ring-slate-200 hover:ring-cyan-300 truncate" title={t.equipo.nombre}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                <span className="truncate">{t.equipo.nombre}</span>
                              </div>
                            );
                          })}
                          {dayTareas.length > 2 && (
                            <p className="text-[10px] text-slate-400 pl-1">+{dayTareas.length - 2} más</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 px-1">
                {Object.values(TAREA_ESTADO_CFG).map((cfg) => (
                  <div key={cfg.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                ))}
              </div>

              {/* Upcoming tasks */}
              {(() => {
                const upcoming = tareas
                  .filter((t) => t.estado === "PENDIENTE" || t.estado === "EN_PROCESO")
                  .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                if (upcoming.length === 0) return null;
                return (
                  <div className="mt-5 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900">Próximas tareas programadas</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {upcoming.map((t) => {
                        const cfg = TAREA_ESTADO_CFG[t.estado] ?? { badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: t.estado };
                        return (
                          <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{t.equipo.nombre}</p>
                                <p className="text-xs text-slate-500">
                                  {t.tipo === "PREVENTIVO" ? "Preventivo" : t.tipo === "CORRECTIVO" ? "Correctivo" : "Inspección"}
                                  {t.asignadoA && ` · ${t.asignadoA.nombre} ${t.asignadoA.apellidos ?? ""}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                              <span className="text-xs font-medium text-slate-700">
                                {new Date(t.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              {(isJefe || isAdmin) && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditTarea(t)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => setDeleteTarea(t)} className="p-1 rounded text-slate-400 hover:text-red-600">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Side panel: selected day detail */}
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden sticky top-0">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {selectedDay
                      ? new Date(selectedDay + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
                      : "Selecciona un día"}
                  </h3>
                  {selectedDay && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tareasDelDia.length} tarea{tareasDelDia.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {!selectedDay ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    <Calendar size={28} className="mx-auto mb-2 text-slate-300" />
                    Haz click en un día del calendario para ver sus tareas
                  </div>
                ) : tareasDelDia.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Sin tareas para este día</div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {tareasDelDia.map((t) => {
                      const cfg = TAREA_ESTADO_CFG[t.estado] ?? { label: t.estado, badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                      return (
                        <div key={t.id} className="px-5 py-3 group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{t.equipo.nombre}</p>
                              {t.equipo.ubicacion && <p className="text-xs text-slate-500">{t.equipo.ubicacion}</p>}
                              <p className="text-xs text-slate-500 mt-0.5">
                                {t.tipo === "PREVENTIVO" ? "Preventivo" : t.tipo === "CORRECTIVO" ? "Correctivo" : "Inspección"}
                                {t.asignadoA && ` · ${t.asignadoA.nombre} ${t.asignadoA.apellidos ?? ""}`}
                              </p>
                              {t.descripcion && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.descripcion}</p>}
                              <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                            </div>
                            {(isJefe || isAdmin) && (
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openEditTarea(t)} className="p-1 rounded text-slate-400 hover:text-slate-700"><Pencil size={13} /></button>
                                <button onClick={() => setDeleteTarea(t)} className="p-1 rounded text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Edit task modal (JEFE / ADMIN) ────────────────────────────────────── */}
      {editTarea && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Editar tarea</h2>
              <button onClick={() => setEditTarea(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditTarea} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{editTarea.equipo.nombre}</p>
                <p className="text-xs text-slate-500">
                  {new Date(editTarea.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                <select value={editTareaForm.estado} onChange={(e) => setEditTareaForm({ ...editTareaForm, estado: e.target.value })} className={inputClass}>
                  {Object.entries(TAREA_ESTADO_CFG).map(([val, c]) => (
                    <option key={val} value={val}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={editTareaForm.descripcion} onChange={(e) => setEditTareaForm({ ...editTareaForm, descripcion: e.target.value })} rows={3} className={inputClass + " resize-none"} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editTareaSaving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {editTareaSaving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setEditTarea(null)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete task modal ─────────────────────────────────────────────────── */}
      {deleteTarea && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar tarea</h2>
                <p className="text-sm text-slate-500">{deleteTarea.equipo.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 mb-5">
              Se eliminará la tarea del{" "}
              {new Date(deleteTarea.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDeleteTarea} disabled={deletingTarea} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deletingTarea ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button onClick={() => setDeleteTarea(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit equipment modal */}
      {editEquipo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Editar equipo</h2>
              <button onClick={() => setEditEquipo(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                <input required value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                  <input value={editForm.marca} onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                  <input value={editForm.modelo} onChange={(e) => setEditForm({ ...editForm, modelo: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Número de serie</label>
                  <input value={editForm.numeroSerie} onChange={(e) => setEditForm({ ...editForm, numeroSerie: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de adquisición</label>
                  <input type="date" value={editForm.fechaAdquisicion} onChange={(e) => setEditForm({ ...editForm, fechaAdquisicion: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ubicación</label>
                  <input value={editForm.ubicacion} onChange={(e) => setEditForm({ ...editForm, ubicacion: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })} className={inputClass}>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={editForm.descripcion} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })} rows={2} className={inputClass} />
              </div>
              {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editSaving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {editSaving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setEditEquipo(null)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New equipment modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Nuevo equipo médico</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="Monitor de signos vitales" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                  <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className={inputClass} placeholder="Philips" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                  <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Número de serie</label>
                  <input value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de adquisición</label>
                  <input type="date" value={form.fechaAdquisicion} onChange={(e) => setForm({ ...form, fechaAdquisicion: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ubicación</label>
                  <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className={inputClass} placeholder="Quirófano 1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inputClass}>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Registrar equipo"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
