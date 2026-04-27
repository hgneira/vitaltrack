"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart2, RefreshCw, Activity, Wrench, MapPin, Clock, AlertTriangle,
  CheckCircle, TrendingUp, Zap, Package, Users, ChevronDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ByArea { nombre: string; total: number; activos: number; enMant: number; fuera: number; pctActivo: number }
interface DayCount { date: string; count: number }
interface HourCount { hora: number; count: number }
interface EquipoReq { nombre: string; count: number }

interface KPIData {
  generatedAt: string;
  filters: { area: string | null; days: number };
  availability: {
    total: number; activos: number; enMantenimiento: number; fueraDeServicio: number;
    pctActivos: number; pctEnMant: number; pctFuera: number;
    byArea: ByArea[]; dailyActivity: DayCount[];
  };
  maintenance: {
    mtbf: number | null; mttr: number | null;
    pctPreventivosATiempo: number | null;
    completadasATiempo: number; completadasTarde: number; vencidasSinCompletar: number;
    mantVencidos: number;
    tareas: { abiertas: number; enProceso: number; completadas: number; canceladas: number };
    mantByTipo: Record<string, number>;
    dailyMant: DayCount[];
  };
  traceability: {
    totalMovimientos: number; avgMovPerDay: number;
    equiposSinActualizacion: number;
    pctChecklists: number | null; equiposConAccesorios: number; verificadosReciente: number;
    dailyMov: DayCount[];
    accionesByTipo: Record<string, number>;
  };
  urgencias: {
    avgTiempoLoan: number | null; totalLoans: number;
    equiposMasSolicitados: EquipoReq[];
    horasPico: HourCount[];
    accionesByTipo: Record<string, number>;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
type TrafficColor = "green" | "yellow" | "red" | "gray";

function trafficColor(value: number | null, thresholds: [number, number], invert = false): TrafficColor {
  if (value === null) return "gray";
  const [warn, crit] = thresholds;
  if (!invert) {
    if (value >= warn) return "green";
    if (value >= crit) return "yellow";
    return "red";
  } else {
    if (value <= warn) return "green";
    if (value <= crit) return "yellow";
    return "red";
  }
}

const TRAFFIC_STYLES: Record<TrafficColor, { dot: string; text: string; ring: string; bg: string }> = {
  green:  { dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", bg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-400",   text: "text-amber-700",   ring: "ring-amber-200",   bg: "bg-amber-50" },
  red:    { dot: "bg-red-500",     text: "text-red-700",     ring: "ring-red-200",     bg: "bg-red-50" },
  gray:   { dot: "bg-slate-400",   text: "text-slate-600",   ring: "ring-slate-200",   bg: "bg-slate-50" },
};

// ── Mini SVG Sparkline ─────────────────────────────────────────────────────
function Sparkline({ data, color = "#3b82f6", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return <div style={{ height }} className="bg-slate-100 rounded" />;
  const max = Math.max(...data, 1);
  const w = 120; const h = height;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <polyline fill={color} fillOpacity="0.12" stroke="none"
        points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

// ── Mini Bar Chart ─────────────────────────────────────────────────────────
function MiniBarChart({ data, color = "#6366f1", height = 48 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (!data.length) return <div style={{ height }} className="bg-slate-100 rounded" />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-0.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height }}>
          <div
            className="w-full rounded-t transition-all"
            style={{ height: `${Math.max((d.value / max) * height, d.value > 0 ? 3 : 0)}px`, backgroundColor: color, opacity: 0.8 }}
          />
          <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            {d.label}: {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, color, icon: Icon, subtext, sparkData, sparkColor, trend,
}: {
  label: string; value: string | number; unit?: string; color: TrafficColor;
  icon: React.ElementType; subtext?: string; sparkData?: number[]; sparkColor?: string; trend?: number | null;
}) {
  const s = TRAFFIC_STYLES[color];
  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ${s.ring} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
            <Icon size={15} className={s.text} />
          </div>
          <p className="text-xs font-semibold text-slate-500 leading-tight">{label}</p>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${s.dot}`} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${s.text}`}>{value}</span>
          {unit && <span className="text-sm text-slate-400">{unit}</span>}
        </div>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
        {trend !== null && trend !== undefined && (
          <p className={`text-xs mt-0.5 font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs período anterior
          </p>
        )}
      </div>
      {sparkData && sparkData.length > 1 && (
        <Sparkline data={sparkData} color={sparkColor ?? "#3b82f6"} height={28} />
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function KpisPage() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [days, setDays] = useState(30);
  const [areas, setAreas] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (area) params.set("area", area);
      params.set("days", String(days));
      const res = await fetch(`/api/kpis?${params}`);
      if (!res.ok) throw new Error("Error al cargar KPIs");
      const json = await res.json();
      setData(json);
      // Collect unique areas
      if (json.availability?.byArea) {
        setAreas(json.availability.byArea.map((a: ByArea) => a.nombre).sort());
      }
    } catch (e) {
      setError("No se pudieron cargar los KPIs");
    }
    setLoading(false);
  }, [area, days]);

  useEffect(() => { load(); }, [load]);

  // Spark data helpers
  const sparkMov  = data?.traceability.dailyMov.map(d => d.count) ?? [];
  const sparkMant = data?.maintenance.dailyMant.map(d => d.count) ?? [];
  const sparkAct  = data?.availability.dailyActivity.map(d => d.count) ?? [];

  // Traffic colors
  const cPctActivos  = trafficColor(data?.availability.pctActivos ?? null, [90, 75]);
  const cMtbf        = trafficColor(data?.maintenance.mtbf ?? null, [30, 15]);
  const cMttr        = trafficColor(data?.maintenance.mttr ?? null, [2, 5], true);
  const cPrevATiempo = trafficColor(data?.maintenance.pctPreventivosATiempo ?? null, [80, 60]);
  const cChecklists  = trafficColor(data?.traceability.pctChecklists ?? null, [70, 40]);
  const cFuera       = trafficColor(data?.availability.fueraDeServicio ?? null, [0, 3], true); // 0 = perfect

  const generatedAt = data ? new Date(data.generatedAt).toLocaleString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  }) : null;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart2 size={16} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Panel de KPIs</h1>
              {generatedAt && <p className="text-xs text-slate-400">Actualizado: {generatedAt}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Area filter */}
            <div className="relative">
              <select value={area} onChange={e => setArea(e.target.value)}
                className="appearance-none border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todas las áreas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {/* Days filter */}
            <div className="relative">
              <select value={days} onChange={e => setDays(Number(e.target.value))}
                className="appearance-none border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
                <option value={180}>Últimos 6 meses</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 disabled:opacity-50">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-8 space-y-8">
        {error && (
          <div className="bg-red-50 ring-1 ring-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── SUMMARY ROW ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total equipos",     value: data.availability.total,          bg: "bg-slate-50",    text: "text-slate-700",   ring: "ring-slate-200" },
                { label: "Operativos",         value: data.availability.activos,        bg: "bg-emerald-50",  text: "text-emerald-700", ring: "ring-emerald-200" },
                { label: "En mantenimiento",   value: data.availability.enMantenimiento, bg: "bg-amber-50",  text: "text-amber-700",   ring: "ring-amber-200" },
                { label: "Fuera de servicio",  value: data.availability.fueraDeServicio, bg: "bg-red-50",    text: "text-red-700",     ring: "ring-red-200" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ${s.ring}`}>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ── SECTION 1: DISPONIBILIDAD ── */}
            <section>
              <SectionHeader icon={Activity} title="Disponibilidad" color="bg-emerald-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <KpiCard
                  label="Equipos operativos"
                  value={`${data.availability.pctActivos}%`}
                  unit={`${data.availability.activos} / ${data.availability.total}`}
                  color={cPctActivos}
                  icon={CheckCircle}
                  subtext="Meta: ≥ 90%"
                  sparkData={sparkAct}
                  sparkColor="#10b981"
                />
                <KpiCard
                  label="En mantenimiento"
                  value={`${data.availability.pctEnMant}%`}
                  unit={`${data.availability.enMantenimiento} equipos`}
                  color={data.availability.pctEnMant > 15 ? "yellow" : "green"}
                  icon={Wrench}
                  subtext="Meta: < 15%"
                />
                <KpiCard
                  label="Fuera de servicio"
                  value={`${data.availability.pctFuera}%`}
                  unit={`${data.availability.fueraDeServicio} equipos`}
                  color={cFuera}
                  icon={AlertTriangle}
                  subtext="Meta: 0%"
                />
              </div>

              {/* By area table */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Disponibilidad por área</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Área</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Activos</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Mant.</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Fuera</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">% Disponible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.availability.byArea.map(a => {
                        const tc = trafficColor(a.pctActivo, [90, 75]);
                        const s = TRAFFIC_STYLES[tc];
                        return (
                          <tr key={a.nombre} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium">{a.nombre}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-500">{a.total}</td>
                            <td className="px-4 py-3 text-sm text-center text-emerald-600 font-medium">{a.activos}</td>
                            <td className="px-4 py-3 text-sm text-center text-amber-600">{a.enMant}</td>
                            <td className="px-4 py-3 text-sm text-center text-red-600">{a.fuera}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5 min-w-16">
                                  <div className={`h-1.5 rounded-full ${tc === "green" ? "bg-emerald-500" : tc === "yellow" ? "bg-amber-400" : "bg-red-500"}`}
                                    style={{ width: `${a.pctActivo}%` }} />
                                </div>
                                <span className={`text-xs font-bold ${s.text} w-8 text-right`}>{a.pctActivo}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ── SECTION 2: MANTENIMIENTO ── */}
            <section>
              <SectionHeader icon={Wrench} title="Mantenimiento" color="bg-amber-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                  label="MTBF"
                  value={data.maintenance.mtbf !== null ? data.maintenance.mtbf : "N/D"}
                  unit={data.maintenance.mtbf !== null ? "días" : ""}
                  color={cMtbf}
                  icon={TrendingUp}
                  subtext="Meta: ≥ 30 días entre fallas"
                />
                <KpiCard
                  label="MTTR"
                  value={data.maintenance.mttr !== null ? data.maintenance.mttr : "N/D"}
                  unit={data.maintenance.mttr !== null ? "días" : ""}
                  color={cMttr}
                  icon={Clock}
                  subtext="Meta: ≤ 2 días de reparación"
                />
                <KpiCard
                  label="Preventivos a tiempo"
                  value={data.maintenance.pctPreventivosATiempo !== null ? `${data.maintenance.pctPreventivosATiempo}%` : "N/D"}
                  color={cPrevATiempo}
                  icon={CheckCircle}
                  subtext={`${data.maintenance.completadasATiempo} cumplidos · ${data.maintenance.completadasTarde} tardíos · ${data.maintenance.vencidasSinCompletar} vencidos`}
                />
                <KpiCard
                  label="Próximos mantenimientos vencidos"
                  value={data.maintenance.mantVencidos}
                  color={data.maintenance.mantVencidos === 0 ? "green" : data.maintenance.mantVencidos < 5 ? "yellow" : "red"}
                  icon={AlertTriangle}
                  subtext="Equipos con fecha vencida sin realizar"
                />
              </div>

              {/* Tasks + tipo breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Órdenes */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Órdenes de mantenimiento</p>
                  <div className="space-y-3">
                    {[
                      { label: "Pendientes",    value: data.maintenance.tareas.abiertas,    color: "bg-amber-400",   text: "text-amber-700" },
                      { label: "En proceso",    value: data.maintenance.tareas.enProceso,   color: "bg-blue-400",    text: "text-blue-700" },
                      { label: "Completadas",   value: data.maintenance.tareas.completadas, color: "bg-emerald-500", text: "text-emerald-700" },
                      { label: "Canceladas",    value: data.maintenance.tareas.canceladas,  color: "bg-slate-300",   text: "text-slate-600" },
                    ].map(item => {
                      const total2 = Object.values(data.maintenance.tareas).reduce((s, v) => s + v, 0);
                      const pct = total2 > 0 ? Math.round(item.value / total2 * 100) : 0;
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                          <span className="text-sm text-slate-600 flex-1">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${item.text} w-6 text-right`}>{item.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mantenimientos por tipo */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Mantenimientos por tipo ({data.filters.days}d)</p>
                  <div className="space-y-2">
                    {Object.entries(data.maintenance.mantByTipo)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([tipo, count]) => {
                        const maxTipo = Math.max(...Object.values(data.maintenance.mantByTipo), 1);
                        const pct = Math.round(count / maxTipo * 100);
                        return (
                          <div key={tipo} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-500 w-24 shrink-0 capitalize">{tipo.toLowerCase()}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div className="h-2 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-bold text-amber-700 w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    {Object.values(data.maintenance.mantByTipo).every(v => v === 0) && (
                      <p className="text-sm text-slate-400 text-center py-4">Sin mantenimientos en el período</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily maintenance chart */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-700 mb-3">Mantenimientos registrados por día</p>
                <MiniBarChart
                  data={data.maintenance.dailyMant.map(d => ({ label: d.date.slice(5), value: d.count }))}
                  color="#f59e0b"
                  height={60}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{data.maintenance.dailyMant[0]?.date ?? ""}</span>
                  <span className="text-xs text-slate-400">{data.maintenance.dailyMant[data.maintenance.dailyMant.length - 1]?.date ?? ""}</span>
                </div>
              </div>
            </section>

            {/* ── SECTION 3: TRAZABILIDAD ── */}
            <section>
              <SectionHeader icon={Package} title="Trazabilidad" color="bg-indigo-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <KpiCard
                  label="Movimientos de equipos"
                  value={data.traceability.totalMovimientos}
                  unit={`(${data.traceability.avgMovPerDay}/día)`}
                  color="green"
                  icon={Activity}
                  subtext={`Últimos ${data.filters.days} días`}
                  sparkData={sparkMov}
                  sparkColor="#6366f1"
                />
                <KpiCard
                  label="Equipos sin actualización"
                  value={data.traceability.equiposSinActualizacion}
                  unit="en >24h"
                  color={data.traceability.equiposSinActualizacion === 0 ? "green" : data.traceability.equiposSinActualizacion < 5 ? "yellow" : "red"}
                  icon={Clock}
                  subtext="Dispositivos con actividad previa sin nueva acción"
                />
                <KpiCard
                  label="Checklists completados"
                  value={data.traceability.pctChecklists !== null ? `${data.traceability.pctChecklists}%` : "N/D"}
                  unit={`${data.traceability.verificadosReciente} / ${data.traceability.equiposConAccesorios} equipos`}
                  color={cChecklists}
                  icon={CheckCircle}
                  subtext="Verificados en los últimos 7 días"
                />
              </div>

              {/* Daily movements + acciones by tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Movimientos por día</p>
                  <MiniBarChart
                    data={data.traceability.dailyMov.map(d => ({ label: d.date.slice(5), value: d.count }))}
                    color="#6366f1"
                    height={60}
                  />
                </div>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Tipos de acciones ({data.filters.days}d)</p>
                  <div className="space-y-2">
                    {[
                      { key: "TOMAR",            label: "Tomar",             color: "bg-blue-400" },
                      { key: "MOVER",             label: "Mover",             color: "bg-indigo-400" },
                      { key: "DEVOLVER",          label: "Devolver",          color: "bg-emerald-400" },
                      { key: "REPORTAR_PROBLEMA", label: "Reportar problema", color: "bg-red-400" },
                    ].map(item => {
                      const val = data.traceability.accionesByTipo[item.key] ?? 0;
                      const maxAcc = Math.max(...Object.values(data.traceability.accionesByTipo), 1);
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-500 w-28 shrink-0">{item.label}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.round(val / maxAcc * 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 w-6 text-right">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION 4: URGENCIAS ── */}
            <section>
              <SectionHeader icon={Zap} title="Urgencias" color="bg-red-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <KpiCard
                  label="Tiempo promedio de préstamo"
                  value={data.urgencias.avgTiempoLoan !== null ? data.urgencias.avgTiempoLoan : "N/D"}
                  unit={data.urgencias.avgTiempoLoan !== null ? "min" : ""}
                  color={data.urgencias.avgTiempoLoan === null ? "gray" : data.urgencias.avgTiempoLoan <= 30 ? "green" : data.urgencias.avgTiempoLoan <= 60 ? "yellow" : "red"}
                  icon={Clock}
                  subtext={`Basado en ${data.urgencias.totalLoans} pares TOMAR/DEVOLVER`}
                />
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <Package size={15} className="text-red-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Equipos más solicitados</p>
                  </div>
                  {data.urgencias.equiposMasSolicitados.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin datos en el período</p>
                  ) : (
                    <div className="space-y-2">
                      {data.urgencias.equiposMasSolicitados.map((eq, i) => {
                        const max = data.urgencias.equiposMasSolicitados[0]?.count ?? 1;
                        return (
                          <div key={eq.nombre + i} className="flex items-center gap-2">
                            <span className="w-4 text-xs font-bold text-slate-400">{i + 1}</span>
                            <span className="text-xs text-slate-600 flex-1 truncate">{eq.nombre}</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.round(eq.count / max * 100)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-red-700 w-4 text-right">{eq.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Peak hours heatmap */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-700 mb-4">Horas pico de uso de dispositivos</p>
                {data.urgencias.horasPico.every(h => h.count === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sin actividad en el período seleccionado</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1">
                      {data.urgencias.horasPico.map(h => {
                        const max = Math.max(...data.urgencias.horasPico.map(x => x.count), 1);
                        const pct = h.count / max;
                        const bg = pct === 0 ? "bg-slate-100" : pct < 0.33 ? "bg-indigo-100" : pct < 0.66 ? "bg-indigo-300" : "bg-indigo-500";
                        return (
                          <div key={h.hora} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className={`w-full rounded-t ${bg} transition-all`} style={{ height: `${Math.max(pct * 60, h.count > 0 ? 4 : 0)}px` }} />
                            <span className="text-xs text-slate-400 hidden md:block">{h.hora}h</span>
                            <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                              {h.hora}:00 — {h.count} acciones
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-400">0h</span>
                      <span className="text-xs text-slate-400">12h</span>
                      <span className="text-xs text-slate-400">23h</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100 inline-block" /> 0</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-100 inline-block" /> bajo</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-300 inline-block" /> medio</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> alto</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 pb-4">
              Los KPIs se calculan en tiempo real con los datos del sistema. Actualizado: {generatedAt}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
