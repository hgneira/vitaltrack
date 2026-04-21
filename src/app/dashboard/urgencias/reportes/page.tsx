"use client";

import { useEffect, useState, useMemo } from "react";
import { FileText, MapPin, AlertTriangle, RefreshCw } from "lucide-react";

interface Equipo {
  id: string;
  nombre: string;
  estado: string;
  ubicacion?: string;
  numeroSerie?: string;
  mantenimientos: { id: string; tipo: string; proximoMantenimiento?: string }[];
  _count: { mantenimientos: number };
}

export default function ReportesPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then((r) => r.json());
    setEquipos(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = equipos.length;
    const activos = equipos.filter((e) => e.estado === "ACTIVO").length;
    const fuera = equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;
    const pctActivo = total > 0 ? Math.round((activos / total) * 100) : 0;
    const allMants = equipos.flatMap((e) => e.mantenimientos);
    const now = new Date();
    const vencidos = allMants.filter((m) => m.proximoMantenimiento && new Date(m.proximoMantenimiento) < now).length;
    return { total, activos, fuera, pctActivo, totalMants: allMants.length, vencidos };
  }, [equipos]);

  const porUbicacion = useMemo(() => {
    const map: Record<string, { total: number; activos: number; enMant: number; fuera: number }> = {};
    equipos.forEach((e) => {
      const key = e.ubicacion || "Sin ubicación";
      if (!map[key]) map[key] = { total: 0, activos: 0, enMant: 0, fuera: 0 };
      map[key].total++;
      if (e.estado === "ACTIVO") map[key].activos++;
      else if (e.estado === "EN_MANTENIMIENTO") map[key].enMant++;
      else map[key].fuera++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [equipos]);

  const criticos = useMemo(() => {
    const now = new Date();
    return [
      ...equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").map((e) => ({ id: e.id, nombre: e.nombre, ubicacion: e.ubicacion, tipo: "Fuera de servicio" as const })),
      ...equipos.flatMap((e) =>
        e.mantenimientos
          .filter((m) => m.proximoMantenimiento && new Date(m.proximoMantenimiento) < now)
          .map(() => ({ id: e.id + "_mant", nombre: e.nombre, ubicacion: e.ubicacion, tipo: "Mantenimiento vencido" as const }))
      ),
    ];
  }, [equipos]);

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <FileText size={16} className="text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Resumen general</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total dispositivos",          value: stats.total,      bg: "bg-slate-50",   color: "text-slate-800" },
                  { label: "Disponibilidad",              value: `${stats.pctActivo}%`, bg: "bg-emerald-50", color: "text-emerald-700" },
                  { label: "Registros de mantenimiento",  value: stats.totalMants, bg: "bg-blue-50",    color: "text-blue-700" },
                  { label: "Alertas activas",             value: stats.vencidos + stats.fuera, bg: "bg-red-50", color: "text-red-600" },
                ].map((s) => (
                  <div key={s.label} className={`text-center p-4 ${s.bg} rounded-xl`}>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Por ubicación */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Distribución por ubicación / área</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Activos</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">En mantenimiento</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Fuera de servicio</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {porUbicacion.map(([ubicacion, data]) => {
                    const pct = data.total > 0 ? Math.round((data.activos / data.total) * 100) : 0;
                    return (
                      <tr key={ubicacion} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <span className="flex items-center gap-2"><MapPin size={13} className="text-slate-400 shrink-0" />{ubicacion}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 text-center">{data.total}</td>
                        <td className="px-6 py-4 text-center"><span className="text-sm font-semibold text-emerald-700">{data.activos}</span></td>
                        <td className="px-6 py-4 text-center"><span className="text-sm font-semibold text-amber-700">{data.enMant}</span></td>
                        <td className="px-6 py-4 text-center"><span className={`text-sm font-semibold ${data.fuera > 0 ? "text-red-600" : "text-slate-400"}`}>{data.fuera}</span></td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${pct >= 80 ? "text-emerald-700" : pct >= 60 ? "text-amber-700" : "text-red-600"}`}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {porUbicacion.length === 0 && (
                <div className="p-12 text-center">
                  <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Sin datos para reportar</p>
                </div>
              )}
            </div>

            {/* Equipos críticos */}
            {criticos.length > 0 && (
              <div className="bg-red-50 rounded-2xl ring-1 ring-red-200 p-6">
                <h3 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={15} /> Equipos que requieren atención inmediata ({criticos.length})
                </h3>
                <div className="space-y-2">
                  {criticos.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 ring-1 ring-red-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                        <p className="text-xs text-slate-500">{c.ubicacion || "Sin ubicación"}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${
                        c.tipo === "Fuera de servicio" ? "bg-red-100 text-red-700 ring-red-200" : "bg-amber-100 text-amber-700 ring-amber-200"
                      }`}>{c.tipo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
