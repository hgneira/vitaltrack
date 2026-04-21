"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SprayCan, ArrowRight, Clock, Bell, CheckCircle } from "lucide-react";

interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  piso?: string;
  tipo: string;
  registros: { fecha: string; tipo: string; user: { nombre: string } }[];
  _count: { alertas: number; registros: number };
}

const TIPO_AREA_LABELS: Record<string, string> = {
  CUARTO_PACIENTE: "Cuarto", BANO: "Baño", PASILLO: "Pasillo", SALA_ESPERA: "Sala de espera",
  QUIROFANO: "Quirófano", LABORATORIO: "Laboratorio", FARMACIA: "Farmacia",
  ADMINISTRACION: "Administración", CAFETERIA: "Cafetería", OTRO: "Otro",
};

const TIPO_AREA_COLORS: Record<string, string> = {
  CUARTO_PACIENTE: "bg-blue-50 text-blue-600", BANO: "bg-cyan-50 text-cyan-600",
  PASILLO: "bg-slate-50 text-slate-600", SALA_ESPERA: "bg-violet-50 text-violet-600",
  QUIROFANO: "bg-red-50 text-red-600", LABORATORIO: "bg-amber-50 text-amber-600",
  FARMACIA: "bg-emerald-50 text-emerald-600", ADMINISTRACION: "bg-indigo-50 text-indigo-600",
  CAFETERIA: "bg-orange-50 text-orange-600", OTRO: "bg-slate-50 text-slate-600",
};

export default function LimpiezaPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/areas").then((r) => r.json()).then((d) => {
      setAreas(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  // Group by piso
  const pisos = [...new Set(areas.map((a) => a.piso ?? "Sin piso"))].sort();

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <SprayCan size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Limpieza y Mantenimiento</h1>
        </div>
        <button onClick={() => router.push("/dashboard/alertas")} className="flex items-center gap-2 bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">
          <Bell size={15} /> Ver alertas
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {pisos.map((piso) => {
              const areasEnPiso = areas.filter((a) => (a.piso ?? "Sin piso") === piso);
              return (
                <div key={piso}>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{piso}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {areasEnPiso.map((area) => {
                      const lastClean = area.registros[0];
                      const typeColor = TIPO_AREA_COLORS[area.tipo] ?? "bg-slate-50 text-slate-600";
                      return (
                        <button
                          key={area.id}
                          onClick={() => router.push(`/dashboard/limpieza/${area.id}`)}
                          className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5 text-left hover:shadow-md hover:ring-cyan-200 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`${typeColor} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                              {TIPO_AREA_LABELS[area.tipo] ?? area.tipo}
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:text-cyan-500 transition-colors mt-1" />
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">{area.nombre}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                            {lastClean ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle size={11} />
                                Limpiado {timeAgo(lastClean.fecha)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Clock size={11} />
                                Sin registro
                              </span>
                            )}
                            {area._count.alertas > 0 && (
                              <span className="flex items-center gap-1 text-red-500 font-semibold">
                                <Bell size={11} />
                                {area._count.alertas} alerta{area._count.alertas > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {area._count.registros} registros totales
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
