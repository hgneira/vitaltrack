"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Users, CalendarCheck, DollarSign, Plus, Check, X,
  ChevronLeft, ChevronRight, ChevronDown, Trash2,
} from "lucide-react";

interface Usuario {
  id: string; nombre: string; apellidos?: string; rol: string; email: string; activo: boolean; foto?: string;
}
interface Asistencia {
  id: string; fecha: string; tipo: string;
  user: { id: string; nombre: string; apellidos?: string; rol: string };
}
interface Pago {
  id: string; periodo: string; monto: number; tipo: string; pagado: boolean;
  descripcion?: string; user: { nombre: string; apellidos?: string; rol: string };
}

const ROL_LABELS: Record<string, string> = {
  MEDICO: "Médico", ENFERMERIA: "Enfermería", INGENIERIA_BIOMEDICA: "Ing. Biomédica",
  JEFE_BIOMEDICA: "Jefe Biomédica", RECEPCION: "Recepción", LIMPIEZA: "Limpieza",
  FARMACIA: "Farmacia", MANTENIMIENTO: "Mantenimiento",
};

const AREA_GROUPS = [
  { label: "Área Médica",              icon: "🩺", roles: ["MEDICO", "ENFERMERIA", "RECEPCION"] },
  { label: "Ing. Biomédica",           icon: "⚙️", roles: ["JEFE_BIOMEDICA", "INGENIERIA_BIOMEDICA"] },
  { label: "Farmacia",                 icon: "💊", roles: ["FARMACIA"] },
  { label: "Limpieza & Mantenimiento", icon: "🧹", roles: ["LIMPIEZA", "MANTENIMIENTO"] },
];

const ESTADOS = ["PRESENTE", "AUSENTE", "PERMISO", "VACACIONES", "INCAPACIDAD"] as const;
type Estado = typeof ESTADOS[number];

const EST_CFG: Record<Estado, { label: string; short: string; cell: string; text: string; dot: string; light: string }> = {
  PRESENTE:    { label: "Presente",    short: "P",  cell: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  AUSENTE:     { label: "Ausente",     short: "A",  cell: "bg-red-100",     text: "text-red-600",     dot: "bg-red-400",     light: "bg-red-50 text-red-700 ring-red-200" },
  PERMISO:     { label: "Permiso",     short: "Pe", cell: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",   light: "bg-amber-50 text-amber-700 ring-amber-200" },
  VACACIONES:  { label: "Vacaciones",  short: "V",  cell: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-400",    light: "bg-blue-50 text-blue-700 ring-blue-200" },
  INCAPACIDAD: { label: "Incapacidad", short: "I",  cell: "bg-slate-200",   text: "text-slate-600",   dot: "bg-slate-400",   light: "bg-slate-100 text-slate-700 ring-slate-200" },
};

type Tab = "asistencia" | "pagos";
interface ActiveCell { uid: string; day: number; x: number; y: number; openUp: boolean; current: Estado | null; }

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function EmpleadosPage() {
  const [tab,        setTab]        = useState<Tab>("asistencia");
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [pagos,      setPagos]      = useState<Pago[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [mes,        setMes]        = useState(() => new Date().toISOString().slice(0, 7));
  const [saving,     setSaving]     = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [periodoFilter, setPeriodoFilter] = useState("");
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoForm,   setPagoForm]   = useState({ userId: "", periodo: mes, monto: "", tipo: "SALARIO", descripcion: "" });
  const [savingPago, setSavingPago] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadUsuarios    = () => fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(Array.isArray(d) ? d.filter((u: Usuario) => u.activo && u.rol !== "ADMINISTRADOR") : []));
  const loadAsistencias = (m = mes) => fetch(`/api/empleados/asistencia?mes=${m}`).then(r => r.json()).then(d => setAsistencias(Array.isArray(d) ? d : []));
  const loadPagos       = () => fetch("/api/empleados/pagos").then(r => r.json()).then(d => setPagos(Array.isArray(d) ? d : []));

  useEffect(() => {
    setLoading(true);
    Promise.all([loadUsuarios(), loadAsistencias(mes), loadPagos()]).then(() => setLoading(false));
  }, [mes]);

  useEffect(() => {
    if (!activeCell) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setActiveCell(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeCell]);

  const { dayInfo } = useMemo(() => {
    const [year, month] = mes.split("-").map(Number);
    const count = new Date(year, month, 0).getDate();
    const info = Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const dow = new Date(year, month - 1, d).getDay();
      return {
        day:       d,
        short:     new Date(year, month - 1, d).toLocaleDateString("es-MX", { weekday: "short" }).slice(0, 2),
        isWeekend: dow === 0 || dow === 6,
      };
    });
    return { dayInfo: info };
  }, [mes]);

  const asistMap = useMemo(() => {
    const map: Record<string, Record<number, Estado>> = {};
    asistencias.forEach(a => {
      const uid = a.user.id;
      const day = new Date(a.fecha).getUTCDate();
      if (!map[uid]) map[uid] = {};
      map[uid][day] = a.tipo as Estado;
    });
    return map;
  }, [asistencias]);

  const todayDay = mes === new Date().toISOString().slice(0, 7) ? new Date().getDate() : -1;

  const globalStats = useMemo(() => {
    let presente = 0, ausente = 0, otros = 0;
    Object.values(asistMap).forEach(days =>
      Object.values(days).forEach(t => {
        if (t === "PRESENTE") presente++;
        else if (t === "AUSENTE") ausente++;
        else otros++;
      })
    );
    return { presente, ausente, otros };
  }, [asistMap]);

  const openCell = (uid: string, day: number, e: React.MouseEvent) => {
    const rect        = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const current     = asistMap[uid]?.[day] ?? null;
    const popH        = 240; // approx popover height
    const spaceBelow  = window.innerHeight - rect.bottom;
    const openUp      = spaceBelow < popH;
    setActiveCell({ uid, day, x: rect.left, y: openUp ? rect.top - popH - 4 : rect.bottom + 4, openUp, current });
  };

  const applyEstado = useCallback(async (estado: Estado | null) => {
    if (!activeCell) return;
    const { uid, day } = activeCell;
    const key = `${uid}-${day}`;
    setActiveCell(null);
    setSaving(key);
    const [year, month] = mes.split("-").map(Number);
    const fecha = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (estado) {
      await fetch("/api/empleados/asistencia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, fecha, tipo: estado }),
      });
    } else {
      await fetch(`/api/empleados/asistencia?userId=${uid}&fecha=${fecha}`, { method: "DELETE" });
    }
    await loadAsistencias(mes);
    setSaving(null);
  }, [activeCell, mes]);

  const prevMes = () => { const [y, m] = mes.split("-").map(Number); setMes(new Date(y, m - 2, 1).toISOString().slice(0, 7)); };
  const nextMes = () => { const [y, m] = mes.split("-").map(Number); setMes(new Date(y, m, 1).toISOString().slice(0, 7)); };
  const mesLabel = new Date(mes + "-02").toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const activePeriodo = periodoFilter || new Date().toISOString().slice(0, 7);
  const prevPeriodo = () => { const [y, m] = activePeriodo.split("-").map(Number); setPeriodoFilter(new Date(y, m - 2, 1).toISOString().slice(0, 7)); };
  const nextPeriodo = () => { const [y, m] = activePeriodo.split("-").map(Number); setPeriodoFilter(new Date(y, m, 1).toISOString().slice(0, 7)); };
  const periodoLabel = periodoFilter ? new Date(periodoFilter + "-02").toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : "Todos los períodos";

  const pagosFiltrados = useMemo(() =>
    periodoFilter ? pagos.filter(p => p.periodo === periodoFilter) : pagos,
    [pagos, periodoFilter]
  );

  const pagoStats = useMemo(() => {
    const total    = pagosFiltrados.reduce((s, p) => s + p.monto, 0);
    const pagado   = pagosFiltrados.filter(p => p.pagado).reduce((s, p) => s + p.monto, 0);
    const pendiente = pagosFiltrados.filter(p => !p.pagado).reduce((s, p) => s + p.monto, 0);
    return { count: pagosFiltrados.length, total, pagado, pendiente };
  }, [pagosFiltrados]);

  const TIPO_CFG: Record<string, { label: string; chip: string }> = {
    SALARIO:   { label: "Salario",   chip: "bg-slate-100 text-slate-700" },
    BONO:      { label: "Bono",      chip: "bg-emerald-100 text-emerald-700" },
    DESCUENTO: { label: "Descuento", chip: "bg-red-100 text-red-600" },
  };

  const pagosPorArea = AREA_GROUPS.map(g => ({
    ...g,
    rows: pagosFiltrados.filter(p => g.roles.includes((p.user as any).rol ?? "")),
  })).filter(g => g.rows.length > 0);

  const handlePago = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPago(true);
    await fetch("/api/empleados/pagos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pagoForm) });
    await loadPagos();
    setShowPagoForm(false);
    setSavingPago(false);
  };

  const marcarPagado = async (id: string, pagado: boolean) => {
    await fetch("/api/empleados/pagos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, pagado: !pagado }) });
    await loadPagos();
  };

  const eliminarPago = async (id: string) => {
    if (!confirm("¿Eliminar este pago?")) return;
    await fetch(`/api/empleados/pagos?id=${id}`, { method: "DELETE" });
    await loadPagos();
  };

  // Group users by area
  const grouped = AREA_GROUPS.map(g => ({
    ...g,
    members: usuarios.filter(u => g.roles.includes(u.rol)),
  })).filter(g => g.members.length > 0);

  const totalCols = dayInfo.length + 2; // name + days + summary

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Módulo de Empleados</h1>
        </div>
        {tab === "pagos" && (
          <button onClick={() => { setPagoForm(f => ({ ...f, periodo: periodoFilter || mes })); setShowPagoForm(true); }}
            className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
            <Plus size={15} /> Registrar pago
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["asistencia", "pagos"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {t === "asistencia" ? <CalendarCheck size={15} /> : <DollarSign size={15} />}
              {t === "asistencia" ? "Asistencia" : "Pagos"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "asistencia" ? (

          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-200 p-1">
                <button onClick={prevMes} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft size={15} /></button>
                <span className="capitalize text-sm font-semibold text-slate-800 px-3 min-w-[160px] text-center">{mesLabel}</span>
                <button onClick={nextMes} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><ChevronRight size={15} /></button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: `${globalStats.presente} presencias`, dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
                  { label: `${globalStats.ausente} ausencias`,   dot: "bg-red-400",     chip: "bg-red-50 text-red-700 ring-red-200" },
                  { label: `${globalStats.otros} permisos/otros`, dot: "bg-amber-400",  chip: "bg-amber-50 text-amber-700 ring-amber-200" },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ${s.chip}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
              {ESTADOS.map(k => {
                const c = EST_CFG[k];
                return (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className={`w-5 h-2.5 rounded-sm ${c.cell}`} />
                    <span className="text-xs text-slate-500">{c.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-2.5 rounded-sm border border-dashed border-slate-300" />
                <span className="text-xs text-slate-400">Sin marcar</span>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="overflow-auto">
                <table className="border-separate border-spacing-0 w-full">
                  {/* Column headers — only rendered once at the top */}
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-5 py-3 text-left w-[210px] min-w-[210px]">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Empleado</span>
                      </th>
                      {dayInfo.map(({ day, short, isWeekend }) => (
                        <th key={day}
                          className={`border-b border-slate-200 w-9 min-w-[36px] py-2 text-center
                            ${isWeekend ? "bg-slate-100" : "bg-slate-50"}
                            ${day === todayDay ? "!bg-cyan-50" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] uppercase font-medium text-slate-400">{short}</span>
                            <span className={`text-[11px] font-bold ${day === todayDay ? "text-cyan-600" : isWeekend ? "text-slate-400" : "text-slate-500"}`}>{day}</span>
                          </div>
                        </th>
                      ))}
                      <th className="sticky right-0 z-20 bg-slate-50 border-b border-l border-slate-200 px-4 py-3 text-left min-w-[170px]">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Resumen del mes</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {grouped.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols} className="py-16 text-center">
                          <CalendarCheck size={36} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500">No hay empleados activos</p>
                        </td>
                      </tr>
                    ) : grouped.map((group) => (
                      <React.Fragment key={group.label}>
                        {/* Area header row */}
                        <tr>
                          <td colSpan={totalCols}
                            className="sticky left-0 px-5 py-2 bg-slate-50 border-b border-t border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{group.icon}</span>
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{group.label}</span>
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{group.members.length}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Employee rows */}
                        {group.members.map((u, idx) => {
                          const userDays = asistMap[u.id] ?? {};
                          const counts: Partial<Record<Estado, number>> = {};
                          Object.values(userDays).forEach(t => { counts[t] = (counts[t] ?? 0) + 1; });
                          const initials = `${u.nombre[0]}${(u.apellidos ?? " ")[0]}`.toUpperCase();

                          return (
                            <tr key={u.id} className="group/row">
                              {/* Sticky name */}
                              <td className={`sticky left-0 z-10 border-b border-r border-slate-100 px-5 py-0 ${idx % 2 === 1 ? "bg-white/80" : "bg-white"} group-hover/row:bg-slate-50 transition-colors`}>
                                <div className="flex items-center gap-3 py-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                                    {u.foto ? <img src={u.foto} alt={u.nombre} className="w-full h-full object-cover" /> : initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate leading-snug">{u.nombre} {u.apellidos ?? ""}</p>
                                    <p className="text-[10px] text-slate-400">{ROL_LABELS[u.rol] ?? u.rol}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Day cells */}
                              {dayInfo.map(({ day, isWeekend }) => {
                                const tipo = userDays[day];
                                const cfg  = tipo ? EST_CFG[tipo] : null;
                                const key  = `${u.id}-${day}`;
                                const busy = saving === key;

                                return (
                                  <td key={day}
                                    className={`border-b border-slate-100 p-0 w-9
                                      ${day === todayDay ? "!bg-cyan-50/40" : isWeekend ? "bg-slate-50/60" : ""}
                                    `}
                                  >
                                    <button
                                      onClick={(e) => !busy && openCell(u.id, day, e)}
                                      disabled={busy}
                                      title={cfg ? `${cfg.label} — clic para cambiar` : "Sin marcar — clic para registrar"}
                                      className={`w-full h-10 flex items-center justify-center transition-all
                                        ${busy ? "opacity-50 cursor-wait" : "cursor-pointer"}
                                        ${cfg ? `${cfg.cell}` : "hover:bg-slate-100"}
                                      `}
                                    >
                                      {busy ? (
                                        <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                      ) : cfg ? (
                                        <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.short}</span>
                                      ) : (
                                        <span className="w-1 h-1 rounded-full bg-slate-200 group-hover/row:bg-slate-300 transition-colors" />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}

                              {/* Sticky summary */}
                              <td className={`sticky right-0 z-10 border-b border-l border-slate-100 px-4 ${idx % 2 === 1 ? "bg-white/80" : "bg-white"} group-hover/row:bg-slate-50 transition-colors`}>
                                <div className="flex items-center gap-1 flex-wrap py-2.5">
                                  {(Object.entries(counts) as [Estado, number][]).map(([estado, cnt]) => {
                                    const cfg = EST_CFG[estado];
                                    return (
                                      <span key={estado} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${cfg.light}`}>
                                        {cfg.short}: {cnt}
                                      </span>
                                    );
                                  })}
                                  {Object.keys(counts).length === 0 && (
                                    <span className="text-[10px] text-slate-300 italic">Sin registros</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        ) : (

          /* ── PAGOS ──────────────────────────────────────────────────────── */
          <div className="space-y-4">

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-200 p-1">
                  <button onClick={prevPeriodo} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft size={15} /></button>
                  <span className="capitalize text-sm font-semibold text-slate-800 px-3 min-w-[160px] text-center">{periodoLabel}</span>
                  <button onClick={nextPeriodo} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><ChevronRight size={15} /></button>
                </div>
                {periodoFilter && (
                  <button onClick={() => setPeriodoFilter("")} className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                    Ver todos
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200 text-slate-600">
                  {pagoStats.count} registro{pagoStats.count !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200">
                  Total <span className="ml-1 text-slate-900">${pagoStats.total.toLocaleString("es-MX")}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pagado ${pagoStats.pagado.toLocaleString("es-MX")}
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Pendiente ${pagoStats.pendiente.toLocaleString("es-MX")}
                </div>
              </div>
            </div>

            {/* Grouped by area — always shows employees */}
            {AREA_GROUPS.map(group => {
              const members = usuarios.filter(u => group.roles.includes(u.rol));
              if (members.length === 0) return null;
              const groupPagos = pagosFiltrados.filter(p => group.roles.includes(p.user.rol));
              const groupTotal = groupPagos.reduce((s, p) => s + p.monto, 0);

              return (
                <div key={group.label} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                  {/* Area header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{group.icon}</span>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{group.label}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{members.length}</span>
                    </div>
                    {groupTotal > 0 && (
                      <span className="text-xs font-semibold text-slate-500">${groupTotal.toLocaleString("es-MX")}</span>
                    )}
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[220px]">Empleado</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Descripción</th>
                        <th className="px-4 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map(u => {
                        const userPagos = groupPagos.filter(p => p.user.nombre === u.nombre && p.user.apellidos === u.apellidos);
                        const initials  = `${u.nombre[0]}${(u.apellidos ?? " ")[0]}`.toUpperCase();

                        if (userPagos.length === 0) {
                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                                    {u.foto ? <img src={u.foto} alt={u.nombre} className="w-full h-full object-cover" /> : initials}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{u.nombre} {u.apellidos ?? ""}</p>
                                    <p className="text-[10px] text-slate-400">{ROL_LABELS[u.rol] ?? u.rol}</p>
                                  </div>
                                </div>
                              </td>
                              <td colSpan={4} className="px-4 py-3 text-xs text-slate-300 italic">Sin pagos {periodoFilter ? "en este período" : "registrados"}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => { setPagoForm(f => ({ ...f, userId: u.id, periodo: periodoFilter || mes })); setShowPagoForm(true); }}
                                  className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                                  <Plus size={11} /> Registrar
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return userPagos.map((p, pi) => {
                          const tipoCfg = TIPO_CFG[p.tipo] ?? { label: p.tipo, chip: "bg-slate-100 text-slate-600" };
                          return (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                {pi === 0 && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                                      {u.foto ? <img src={u.foto} alt={u.nombre} className="w-full h-full object-cover" /> : initials}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{u.nombre} {u.apellidos ?? ""}</p>
                                      <p className="text-[10px] text-slate-400">{ROL_LABELS[u.rol] ?? u.rol}</p>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tipoCfg.chip}`}>{tipoCfg.label}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-bold tabular-nums ${p.tipo === "DESCUENTO" ? "text-red-600" : "text-slate-900"}`}>
                                  {p.tipo === "DESCUENTO" ? "−" : ""}${p.monto.toLocaleString("es-MX")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button onClick={() => marcarPagado(p.id, p.pagado)}
                                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors ${p.pagado ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                                  {p.pagado ? <><Check size={11} /> Pagado</> : <><ChevronDown size={11} /> Pendiente</>}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">{p.descripcion || "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {pi === 0 && (
                                    <button onClick={() => { setPagoForm(f => ({ ...f, userId: u.id, periodo: periodoFilter || mes })); setShowPagoForm(true); }}
                                      className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                                      <Plus size={11} /> Agregar
                                    </button>
                                  )}
                                  <button onClick={() => eliminarPago(p.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* State picker popover */}
      {activeCell && (
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: activeCell.y, left: Math.min(activeCell.x, window.innerWidth - 190), zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl ring-1 ring-slate-200 p-1.5 w-48"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1">Registrar asistencia</p>
          {ESTADOS.map(estado => {
            const cfg     = EST_CFG[estado];
            const current = activeCell.current === estado;
            return (
              <button key={estado} onClick={() => applyEstado(estado)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left
                  ${current ? `${cfg.cell} ${cfg.text} font-semibold` : "hover:bg-slate-50 text-slate-700"}`}
              >
                <span className={`w-3 h-3 rounded-sm shrink-0 ${cfg.cell} ring-1 ring-black/5`} />
                {cfg.label}
                {current && <Check size={11} className="ml-auto" />}
              </button>
            );
          })}
          {activeCell.current && (
            <>
              <div className="h-px bg-slate-100 my-1" />
              <button onClick={() => applyEstado(null)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                <X size={13} /> Quitar registro
              </button>
            </>
          )}
        </div>
      )}

      {/* Pago modal */}
      {showPagoForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Registrar pago</h2>
              <button onClick={() => setShowPagoForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handlePago} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Empleado *</label>
                <select required value={pagoForm.userId} onChange={e => setPagoForm(f => ({ ...f, userId: e.target.value }))} className={inputClass}>
                  <option value="">Seleccionar empleado</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos} — {ROL_LABELS[u.rol]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Período *</label>
                  <input required type="month" value={pagoForm.periodo} onChange={e => setPagoForm(f => ({ ...f, periodo: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Monto *</label>
                  <input required type="number" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} className={inputClass} placeholder="15000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                <select value={pagoForm.tipo} onChange={e => setPagoForm(f => ({ ...f, tipo: e.target.value }))} className={inputClass}>
                  <option value="SALARIO">Salario</option>
                  <option value="BONO">Bono</option>
                  <option value="DESCUENTO">Descuento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <input value={pagoForm.descripcion} onChange={e => setPagoForm(f => ({ ...f, descripcion: e.target.value }))} className={inputClass} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingPago} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingPago ? "Guardando…" : "Registrar pago"}
                </button>
                <button type="button" onClick={() => setShowPagoForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
