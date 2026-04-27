"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, Search, CheckCircle, Wrench, AlertTriangle, MapPin, Filter, X, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Equipo {
  id: string; nombre: string; marca?: string; modelo?: string;
  numeroSerie?: string; ubicacion?: string; estado: string;
  mantenimientos: { fecha: string }[];
}

const ESTADO_CFG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600 ring-1 ring-red-200",             dot: "bg-red-500",    icon: AlertTriangle },
};

export default function InventarioGeneralPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterUbicacion, setFilterUbicacion] = useState("TODAS");
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then(r => r.json());
    const list: Equipo[] = Array.isArray(data) ? data : [];
    setEquipos(list);
    const initial: Record<string, boolean> = {};
    const areas = [...new Set(list.map(e => e.ubicacion ?? "Sin área"))];
    areas.forEach((a, i) => { initial[a] = i === 0; });
    setOpenAreas(initial);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ubicaciones = useMemo(() => {
    const s = new Set<string>();
    equipos.forEach(e => { if (e.ubicacion) s.add(e.ubicacion); });
    return Array.from(s).sort();
  }, [equipos]);

  const filtered = useMemo(() => equipos.filter(e => {
    const q = search.toLowerCase();
    return (
      (e.nombre.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q) || (e.numeroSerie ?? "").toLowerCase().includes(q) || (e.marca ?? "").toLowerCase().includes(q)) &&
      (filterEstado === "TODOS" || e.estado === filterEstado) &&
      (filterUbicacion === "TODAS" || e.ubicacion === filterUbicacion)
    );
  }), [equipos, search, filterEstado, filterUbicacion]);

  const byArea = useMemo(() => {
    const map = new Map<string, Equipo[]>();
    filtered.forEach(e => {
      const key = e.ubicacion ?? "Sin área";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = {
    total: equipos.length,
    activos: equipos.filter(e => e.estado === "ACTIVO").length,
    enMant: equipos.filter(e => e.estado === "EN_MANTENIMIENTO").length,
    fuera: equipos.filter(e => e.estado === "FUERA_DE_SERVICIO").length,
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Activity size={16} className="text-slate-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Inventario General</h1>
          {!loading && <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{equipos.length} equipos</span>}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
          <RefreshCw size={13} /> Actualizar
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total equipos",     value: stats.total,   color: "text-slate-700",   bg: "bg-slate-50" },
            { label: "Activos",           value: stats.activos, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "En mantenimiento",  value: stats.enMant,  color: "text-amber-700",   bg: "bg-amber-50" },
            { label: "Fuera de servicio", value: stats.fuera,   color: "text-red-600",     bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ring-slate-200`}>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{loading ? "…" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo, área, serie…"
              className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-slate-400" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
            </select>
          </div>
          <select value={filterUbicacion} onChange={e => setFilterUbicacion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="TODAS">Todas las áreas</option>
            {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {(search || filterEstado !== "TODOS" || filterUbicacion !== "TODAS") && (
            <button onClick={() => { setSearch(""); setFilterEstado("TODOS"); setFilterUbicacion("TODAS"); }} className="text-sm text-slate-500 hover:text-slate-800 font-medium">Limpiar</button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {byArea.map(([area, eqs]) => {
              const isOpen = openAreas[area] ?? false;
              const activos = eqs.filter(e => e.estado === "ACTIVO").length;
              const enMant = eqs.filter(e => e.estado === "EN_MANTENIMIENTO").length;
              const fuera = eqs.filter(e => e.estado === "FUERA_DE_SERVICIO").length;
              return (
                <div key={area} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <button onClick={() => setOpenAreas(s => ({ ...s, [area]: !s[area] }))}
                    className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                      <MapPin size={14} className="text-slate-500" />
                      <span className="font-semibold text-slate-800 text-sm">{area}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{eqs.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {activos > 0 && <span className="text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">{activos} activos</span>}
                      {enMant > 0 && <span className="text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 rounded-full">{enMant} en mant.</span>}
                      {fuera > 0 && <span className="text-red-600 bg-red-50 ring-1 ring-red-200 px-2 py-0.5 rounded-full">{fuera} fuera</span>}
                    </div>
                  </button>
                  {isOpen && (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Dispositivo</th>
                          <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">N° Serie</th>
                          <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Estado</th>
                          <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Último mant.</th>
                          <th className="px-6 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eqs.map(eq => {
                          const cfg = ESTADO_CFG[eq.estado] ?? { label: eq.estado, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Activity };
                          const Icon = cfg.icon;
                          const ultimo = eq.mantenimientos[eq.mantenimientos.length - 1];
                          return (
                            <tr key={eq.id} className="hover:bg-slate-50 group">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{eq.nombre}</p>
                                    {(eq.marca || eq.modelo) && <p className="text-xs text-slate-400">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-sm text-slate-600 font-mono">{eq.numeroSerie ?? "—"}</td>
                              <td className="px-6 py-3">
                                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${cfg.color}`}>
                                  <Icon size={11} /> {cfg.label}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-slate-500">
                                {ultimo ? new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "Sin registro"}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <Link href={`/dashboard/equipos/${eq.id}`}
                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 font-medium ml-auto w-fit">
                                  <ExternalLink size={13} /> Ver ficha
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
