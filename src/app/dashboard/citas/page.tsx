"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Plus, Search, Pencil, Trash2, X,
  AlertTriangle, ChevronLeft, ChevronRight, Calendar,
  Clock, User, AlignLeft, CheckCircle, XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cita {
  id: string;
  fecha: string;
  motivo?: string;
  notas?: string;
  estado: string;
  pacienteId: string;
  medicoId: string;
  paciente: { nombre: string; apellidos: string };
  medico: { nombre: string; apellidos?: string; titulo?: string };
}

interface Paciente { id: string; nombre: string; apellidos: string; }
interface Medico   { id: string; nombre: string; apellidos?: string; titulo?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<string, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  PROGRAMADA: { label: "Programada", badge: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",        dot: "bg-blue-500",    icon: Clock },
  COMPLETADA: { label: "Completada", badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  CANCELADA:  { label: "Cancelada",  badge: "bg-red-100 text-red-600 ring-1 ring-red-200",            dot: "bg-red-400",     icon: XCircle },
};

const DIAS  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent";

const todayStr = new Date().toISOString().slice(0, 10);

function dateKey(fecha: string) {
  return new Date(fecha).toISOString().slice(0, 10);
}

function formatDayHeader(key: string) {
  if (key === todayStr) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === tomorrow.toISOString().slice(0, 10)) return "Mañana";
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CitasPage() {
  const router = useRouter();

  const [citas,     setCitas]     = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos,   setMedicos]   = useState<Medico[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [view,   setView]   = useState<"timeline" | "calendario">("timeline");
  const [search, setSearch] = useState("");

  // Calendar navigation
  const [calYear,     setCalYear]     = useState(() => new Date().getFullYear());
  const [calMonth,    setCalMonth]    = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit modal
  const [editCita, setEditCita] = useState<Cita | null>(null);
  const [editForm, setEditForm] = useState({ fecha: "", motivo: "", notas: "", estado: "", pacienteId: "", medicoId: "" });
  const [saving,   setSaving]   = useState(false);

  // Delete confirm
  const [deleteCita, setDeleteCita] = useState<Cita | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    const [citasData, pacData, medData] = await Promise.all([
      fetch("/api/citas").then((r) => r.json()),
      fetch("/api/pacientes").then((r) => r.json()),
      fetch("/api/usuarios?rol=MEDICO").then((r) => r.json()),
    ]);
    setCitas(Array.isArray(citasData) ? citasData : []);
    setPacientes(Array.isArray(pacData) ? pacData : []);
    setMedicos(Array.isArray(medData) ? medData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return citas.filter((c) =>
      c.paciente.nombre.toLowerCase().includes(q) ||
      c.paciente.apellidos.toLowerCase().includes(q) ||
      c.medico.nombre.toLowerCase().includes(q) ||
      (c.motivo ?? "").toLowerCase().includes(q)
    );
  }, [citas, search]);

  // ── Timeline groups ───────────────────────────────────────────────────────

  const timelineGroups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    const groups: { key: string; citas: Cita[] }[] = [];
    const seen = new Set<string>();
    for (const c of sorted) {
      const key = dateKey(c.fecha);
      if (!seen.has(key)) { seen.add(key); groups.push({ key, citas: [] }); }
      groups.find((g) => g.key === key)!.citas.push(c);
    }
    return groups;
  }, [filtered]);

  // ── Calendar helpers ──────────────────────────────────────────────────────

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const citasByDay = useMemo(() => {
    const map: Record<string, Cita[]> = {};
    citas.forEach((c) => {
      const key = dateKey(c.fecha);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [citas]);

  const dayKey = (d: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); setSelectedDay(null); };

  const citasDelDia = selectedDay ? (citasByDay[selectedDay] ?? []) : [];

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (c: Cita) => {
    setEditCita(c);
    setEditForm({
      fecha:      new Date(c.fecha).toISOString().slice(0, 16),
      motivo:     c.motivo ?? "",
      notas:      c.notas ?? "",
      estado:     c.estado,
      pacienteId: c.pacienteId,
      medicoId:   c.medicoId,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCita) return;
    setSaving(true);
    await fetch(`/api/citas/${editCita.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    await load();
    setEditCita(null);
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteCita) return;
    setDeleting(true);
    await fetch(`/api/citas/${deleteCita.id}`, { method: "DELETE" });
    await load();
    setDeleteCita(null);
    setDeleting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Citas</h1>
          {!loading && <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{citas.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <AlignLeft size={14} /> Timeline
            </button>
            <button
              onClick={() => setView("calendario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "calendario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Calendar size={14} /> Calendario
            </button>
          </div>
          <button
            onClick={() => router.push("/dashboard/citas/nueva")}
            className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus size={15} /> Nueva cita
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">

        {/* ── TIMELINE ─────────────────────────────────────────────────────── */}
        {view === "timeline" && (
          <>
            {/* Search */}
            <div className="relative mb-6 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por paciente, médico o motivo…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : timelineGroups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
                <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-700">{search ? "Sin resultados" : "No hay citas registradas"}</p>
                {!search && (
                  <button onClick={() => router.push("/dashboard/citas/nueva")} className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">
                    Programar primera cita
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-2xl space-y-0">
                {timelineGroups.map((group, gi) => {
                  const isPast = group.key < todayStr;
                  const isToday = group.key === todayStr;
                  const d = new Date(group.key + "T12:00:00");

                  return (
                    <div key={group.key} className="flex gap-4">
                      {/* Date column */}
                      <div className="flex flex-col items-center w-16 shrink-0">
                        {/* Date chip */}
                        <div className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl text-center shrink-0 ${
                          isToday
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/30"
                            : isPast
                            ? "bg-slate-100 text-slate-400"
                            : "bg-slate-900 text-white"
                        }`}>
                          <span className="text-[10px] font-semibold uppercase leading-none">
                            {MESES_SHORT[d.getMonth()]}
                          </span>
                          <span className="text-xl font-bold leading-tight">{d.getDate()}</span>
                        </div>
                        {/* Vertical line */}
                        {gi < timelineGroups.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-2 min-h-[16px]" />
                        )}
                      </div>

                      {/* Cards column */}
                      <div className={`flex-1 pb-6 ${gi === timelineGroups.length - 1 ? "pb-0" : ""}`}>
                        {/* Day label */}
                        <div className="flex items-center gap-2 mb-3 mt-1">
                          <span className={`text-sm font-semibold capitalize ${isToday ? "text-cyan-700" : isPast ? "text-slate-400" : "text-slate-700"}`}>
                            {formatDayHeader(group.key)}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">HOY</span>
                          )}
                          <span className="text-xs text-slate-400">{group.citas.length} cita{group.citas.length !== 1 ? "s" : ""}</span>
                        </div>

                        {/* Cita cards */}
                        <div className="space-y-2">
                          {group.citas.map((c) => {
                            const cfg = ESTADO_CFG[c.estado] ?? { label: c.estado, badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Clock };
                            const StatusIcon = cfg.icon;
                            const hora = new Date(c.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

                            return (
                              <div
                                key={c.id}
                                className={`bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3 flex items-start gap-3 group hover:ring-cyan-200 hover:shadow-sm transition-all ${isPast ? "opacity-60" : ""}`}
                              >
                                {/* Time */}
                                <div className="flex flex-col items-center shrink-0 pt-0.5">
                                  <Clock size={13} className="text-slate-400 mb-0.5" />
                                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{hora}</span>
                                </div>

                                <div className="w-px self-stretch bg-slate-100 shrink-0" />

                                {/* Patient */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">
                                    {c.paciente.nombre[0]}{c.paciente.apellidos[0]}
                                  </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                                    {c.paciente.nombre} {c.paciente.apellidos}
                                  </p>
                                  <p className="text-xs text-slate-500">{c.medico.titulo ? `${c.medico.titulo} ` : ""}{c.medico.nombre}</p>
                                  {c.motivo && (
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{c.motivo}</p>
                                  )}
                                </div>

                                {/* Estado */}
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                                  <StatusIcon size={10} />
                                  {cfg.label}
                                </span>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => setDeleteCita(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── CALENDARIO ─────────────────────────────────────────────────── */}
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
                    const dayCitas = citasByDay[key] ?? [];
                    const isToday = key === todayStr;
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
                          {dayCitas.slice(0, 2).map((c) => {
                            const dot = ESTADO_CFG[c.estado]?.dot ?? "bg-slate-400";
                            return (
                              <div
                                key={c.id}
                                onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                                className="flex items-center gap-1 text-[10px] text-slate-700 bg-white rounded px-1 py-0.5 ring-1 ring-slate-200 hover:ring-cyan-300 truncate"
                                title={`${c.paciente.nombre} ${c.paciente.apellidos}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                <span className="truncate">{c.paciente.nombre}</span>
                              </div>
                            );
                          })}
                          {dayCitas.length > 2 && (
                            <p className="text-[10px] text-slate-400 pl-1">+{dayCitas.length - 2} más</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 px-1">
                {Object.values(ESTADO_CFG).map((cfg) => (
                  <div key={cfg.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
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
                      {citasDelDia.length} cita{citasDelDia.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {!selectedDay ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    <CalendarDays size={28} className="mx-auto mb-2 text-slate-300" />
                    Haz click en un día del calendario para ver sus citas
                  </div>
                ) : citasDelDia.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    Sin citas para este día
                    <button onClick={() => router.push("/dashboard/citas/nueva")} className="block mx-auto mt-3 text-cyan-600 hover:text-cyan-800 font-medium text-xs">
                      + Programar cita
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {citasDelDia.map((c) => {
                      const cfg = ESTADO_CFG[c.estado] ?? { label: c.estado, badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Clock };
                      return (
                        <div key={c.id} className="px-5 py-3 group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{c.paciente.nombre} {c.paciente.apellidos}</p>
                              <p className="text-xs text-slate-500">{c.medico.titulo ? `${c.medico.titulo} ` : ""}{c.medico.nombre}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(c.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                                {c.motivo && ` · ${c.motivo}`}
                              </p>
                              <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Pencil size={13} /></button>
                              <button onClick={() => setDeleteCita(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                            </div>
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

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editCita && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Editar cita</h2>
              <button onClick={() => setEditCita(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Paciente *</label>
                <select required value={editForm.pacienteId} onChange={(e) => setEditForm({ ...editForm, pacienteId: e.target.value })} className={inputClass}>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médico *</label>
                <select required value={editForm.medicoId} onChange={(e) => setEditForm({ ...editForm, medicoId: e.target.value })} className={inputClass}>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.titulo ? `${m.titulo} ` : ""}{m.nombre} {m.apellidos ?? ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha y hora *</label>
                <input required type="datetime-local" value={editForm.fecha} onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                <select value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })} className={inputClass}>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motivo</label>
                <input value={editForm.motivo} onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
                <textarea value={editForm.notas} onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })} rows={3} className={inputClass + " resize-none"} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setEditCita(null)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteCita && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar cita</h2>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 mb-5">
              Se eliminará la cita de{" "}
              <span className="font-semibold">{deleteCita.paciente.nombre} {deleteCita.paciente.apellidos}</span>{" "}
              del {new Date(deleteCita.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button onClick={() => setDeleteCita(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
