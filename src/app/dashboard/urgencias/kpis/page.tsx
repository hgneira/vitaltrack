"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart2, RefreshCw } from "lucide-react";

interface Equipo {
  id: string;
  estado: string;
  mantenimientos: { id: string; tipo: string; proximoMantenimiento?: string }[];
  _count: { mantenimientos: number };
}

export default function KpisPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then((r) => r.json());
    setEquipos(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const total = equipos.length;
    const activos = equipos.filter((e) => e.estado === "ACTIVO").length;
    const enMant = equipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length;
    const fuera = equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;
    const pctActivo = total > 0 ? Math.round((activos / total) * 100) : 0;
    const conHistorial = equipos.filter((e) => e._count.mantenimientos > 0).length;
    const pctRegistros = total > 0 ? Math.round((conHistorial / total) * 100) : 0;

    const now = new Date();
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    let vencidos = 0, porVencer = 0;
    equipos.forEach((e) =>
      e.mantenimientos.forEach((m) => {
        if (m.proximoMantenimiento) {
          const d = new Date(m.proximoMantenimiento);
          if (d < now) vencidos++;
          else if (d <= in30) porVencer++;
        }
      })
    );

    const allMants = equipos.flatMap((e) => e.mantenimientos);
    const prev = allMants.filter((m) => m.tipo === "PREVENTIVO").length;
    const corr = allMants.filter((m) => m.tipo === "CORRECTIVO").length;
    const insp = allMants.filter((m) => m.tipo === "INSPECCION").length;
    const totMant = allMants.length;

    return { total, activos, enMant, fuera, pctActivo, pctRegistros, conHistorial, vencidos, porVencer, prev, corr, insp, totMant };
  }, [equipos]);

  const Card = ({ label, value, sub, color, bg }: { label: string; value: string | number; sub: string; color: string; bg: string }) => (
    <div className={`rounded-2xl p-5 ring-1 ${bg}`}>
      <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{loading ? "…" : value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );

  const Bar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-600">{label}</span>
          <span className="font-semibold text-slate-800">{value} <span className="text-slate-400 font-normal">({pct}%)</span></span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <BarChart2 size={16} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Indicadores KPI</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
          <RefreshCw size={13} /> Actualizar
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            label="Disponibilidad operativa"
            value={`${kpis.pctActivo}%`}
            sub={`${kpis.activos} de ${kpis.total} equipos activos`}
            color={kpis.pctActivo >= 80 ? "text-emerald-700" : kpis.pctActivo >= 60 ? "text-amber-700" : "text-red-600"}
            bg={kpis.pctActivo >= 80 ? "bg-emerald-50 ring-emerald-200" : kpis.pctActivo >= 60 ? "bg-amber-50 ring-amber-200" : "bg-red-50 ring-red-200"}
          />
          <Card
            label="Registros actualizados"
            value={`${kpis.pctRegistros}%`}
            sub={`${kpis.conHistorial} equipos con historial`}
            color={kpis.pctRegistros >= 80 ? "text-emerald-700" : kpis.pctRegistros >= 50 ? "text-amber-700" : "text-red-600"}
            bg={kpis.pctRegistros >= 80 ? "bg-emerald-50 ring-emerald-200" : kpis.pctRegistros >= 50 ? "bg-amber-50 ring-amber-200" : "bg-red-50 ring-red-200"}
          />
          <Card
            label="Incidencias activas"
            value={kpis.fuera}
            sub="Equipos fuera de servicio"
            color={kpis.fuera === 0 ? "text-emerald-700" : "text-red-600"}
            bg={kpis.fuera === 0 ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}
          />
          <Card
            label="Mantenimientos vencidos"
            value={kpis.vencidos}
            sub={`${kpis.porVencer} por vencer (30 días)`}
            color={kpis.vencidos === 0 ? "text-emerald-700" : "text-red-600"}
            bg={kpis.vencidos === 0 ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}
          />
        </div>

        {/* Distribución por estado */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Distribución por estado operativo</h3>
          <div className="space-y-3">
            <Bar label="Activo"            value={kpis.activos} total={kpis.total} color="bg-emerald-500" />
            <Bar label="En mantenimiento"  value={kpis.enMant}  total={kpis.total} color="bg-amber-400" />
            <Bar label="Fuera de servicio" value={kpis.fuera}   total={kpis.total} color="bg-red-500" />
          </div>
        </div>

        {/* Por tipo de mantenimiento */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Mantenimientos por tipo</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Preventivo", value: kpis.prev, color: "bg-cyan-100 text-cyan-700" },
              { label: "Correctivo", value: kpis.corr, color: "bg-red-100 text-red-700" },
              { label: "Inspección", value: kpis.insp, color: "bg-slate-100 text-slate-700" },
            ].map((t) => (
              <div key={t.label} className={`rounded-xl p-4 ${t.color}`}>
                <p className="text-xs font-medium mb-1">{t.label}</p>
                <p className="text-2xl font-bold">{loading ? "…" : t.value}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {kpis.totMant > 0 ? Math.round((t.value / kpis.totMant) * 100) : 0}% del total
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
