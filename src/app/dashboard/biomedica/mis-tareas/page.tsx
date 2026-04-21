"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardList, Wrench, Calendar, AlertTriangle, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";

interface Tarea {
  id: string;
  fecha: string;
  estado: string;
  tipo: string;
  descripcion?: string;
  recurrencia?: string;
  equipo: { id: string; nombre: string; ubicacion?: string };
  asignadoA?: { id: string; nombre: string; apellidos?: string };
}

const TAREA_ESTADO_CFG: Record<string, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: "Pendiente",  badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",   icon: Clock },
  EN_PROCESO: { label: "En proceso", badge: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",          dot: "bg-cyan-500",    icon: RefreshCw },
  COMPLETADO: { label: "Completado", badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  CANCELADO:  { label: "Cancelado",  badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",       dot: "bg-slate-400",   icon: XCircle },
};

export default function MisTareasPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [tareas,  setTareas]  = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tareas-mantenimiento")
      .then((r) => r.json())
      .then((d) => { setTareas(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const misTareas = tareas
    .filter((t) => t.asignadoA?.id === userId)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const pendientes  = misTareas.filter((t) => t.estado === "PENDIENTE" || t.estado === "EN_PROCESO");
  const completadas = misTareas.filter((t) => t.estado === "COMPLETADO" || t.estado === "CANCELADO");

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-3 shrink-0">
        <ClipboardList size={20} className="text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Mis tareas</h1>
        {!loading && (
          <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {misTareas.length}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : misTareas.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-12 text-center">
            <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No tienes tareas asignadas</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">

            {/* Pendientes / En proceso */}
            {pendientes.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" /> Pendientes
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendientes.length}</span>
                </h2>
                <div className="space-y-3">
                  {pendientes.map((t) => <TareaCard key={t.id} tarea={t} />)}
                </div>
              </section>
            )}

            {/* Completadas / Canceladas */}
            {completadas.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" /> Completadas
                  <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{completadas.length}</span>
                </h2>
                <div className="space-y-3 opacity-70">
                  {completadas.map((t) => <TareaCard key={t.id} tarea={t} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TareaCard({ tarea: t }: { tarea: Tarea }) {
  const cfg = TAREA_ESTADO_CFG[t.estado] ?? { label: t.estado, badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Clock };
  const isPast = new Date(t.fecha) < new Date() && t.estado === "PENDIENTE";

  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 p-5 flex items-start gap-4 ${isPast ? "ring-amber-300" : "ring-slate-200"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        t.tipo === "PREVENTIVO" ? "bg-blue-50" : t.tipo === "CORRECTIVO" ? "bg-orange-50" : "bg-violet-50"
      }`}>
        <Wrench size={18} className={
          t.tipo === "PREVENTIVO" ? "text-blue-500" : t.tipo === "CORRECTIVO" ? "text-orange-500" : "text-violet-500"
        } />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t.equipo.nombre}</p>
            {t.equipo.ubicacion && <p className="text-xs text-slate-500">{t.equipo.ubicacion}</p>}
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>{cfg.label}</span>
        </div>
        {t.descripcion && <p className="text-xs text-slate-600 mt-1">{t.descripcion}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(t.fecha).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            t.tipo === "PREVENTIVO" ? "bg-blue-100 text-blue-700" :
            t.tipo === "CORRECTIVO" ? "bg-orange-100 text-orange-700" :
            "bg-violet-100 text-violet-700"
          }`}>
            {t.tipo === "PREVENTIVO" ? "Preventivo" : t.tipo === "CORRECTIVO" ? "Correctivo" : "Inspección"}
          </span>
          {isPast && (
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle size={10} /> Pendiente de completar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
