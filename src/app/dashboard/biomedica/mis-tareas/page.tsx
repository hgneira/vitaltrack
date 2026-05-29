"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Wrench, Calendar, AlertTriangle, CheckCircle,
  Clock, RefreshCw, XCircle, ChevronRight, X, Plus,
} from "lucide-react";

const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";

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

const TAREA_ESTADO_CFG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: "Pendiente",  badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       icon: Clock },
  EN_PROCESO: { label: "En proceso", badge: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",          icon: RefreshCw },
  COMPLETADO: { label: "Completado", badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", icon: CheckCircle },
  CANCELADO:  { label: "Cancelado",  badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",       icon: XCircle },
};

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function MisTareasPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const router = useRouter();

  const [tareas,     setTareas]     = useState<Tarea[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalTarea, setModalTarea] = useState<Tarea | null>(null);
  const [mantForm,   setMantForm]   = useState({
    tipo: "CORRECTIVO",
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    nuevoEstado: "ACTIVO",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/tareas-mantenimiento")
      .then((r) => r.json())
      .then((d) => { setTareas(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!PUSHER_KEY) return;
    let pusherInstance: any = null;
    import("pusher-js").then(({ default: Pusher }) => {
      pusherInstance = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      const ch = pusherInstance.subscribe("alertas-biomedica");
      ch.bind("nueva-alerta", () => load());
    });
    return () => { if (pusherInstance) pusherInstance.disconnect(); };
  }, [load]);

  const cambiarEstado = async (tarea: Tarea, estado: string) => {
    await fetch(`/api/tareas-mantenimiento/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    load();
  };

  const openMantenimiento = (tarea: Tarea) => {
    setMantForm({
      tipo: tarea.tipo,
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: "",
      nuevoEstado: "ACTIVO",
    });
    setModalTarea(tarea);
  };

  const submitMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTarea) return;
    setSaving(true);
    try {
      await fetch(`/api/equipos/${modalTarea.equipo.id}/mantenimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: mantForm.tipo,
          fecha: mantForm.fecha,
          descripcion: mantForm.descripcion || undefined,
          nuevoEstado: mantForm.nuevoEstado,
          tecnicoId: userId,
        }),
      });
      // If not setting back to ACTIVO, manually mark the task completed
      if (mantForm.nuevoEstado !== "ACTIVO") {
        await fetch(`/api/tareas-mantenimiento/${modalTarea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "COMPLETADO" }),
        });
      }
      setModalTarea(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const misTareas = tareas
    .filter((t) => !t.asignadoA || t.asignadoA.id === userId)
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
            {pendientes.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" /> Pendientes
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendientes.length}</span>
                </h2>
                <div className="space-y-3">
                  {pendientes.map((t) => (
                    <TareaCard
                      key={t.id}
                      tarea={t}
                      onNavigate={() => router.push(`/dashboard/biomedica/${t.equipo.id}`)}
                      onTomar={t.estado === "PENDIENTE" ? () => cambiarEstado(t, "EN_PROCESO") : undefined}
                      onMantenimiento={() => openMantenimiento(t)}
                    />
                  ))}
                </div>
              </section>
            )}

            {completadas.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" /> Completadas
                  <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{completadas.length}</span>
                </h2>
                <div className="space-y-3 opacity-70">
                  {completadas.map((t) => (
                    <TareaCard
                      key={t.id}
                      tarea={t}
                      onNavigate={() => router.push(`/dashboard/biomedica/${t.equipo.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Maintenance modal */}
      {modalTarea && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Registrar mantenimiento</h2>
                <p className="text-xs text-slate-500 mt-0.5">{modalTarea.equipo.nombre}{modalTarea.equipo.ubicacion ? ` · ${modalTarea.equipo.ubicacion}` : ""}</p>
              </div>
              <button onClick={() => setModalTarea(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={submitMantenimiento} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={mantForm.tipo} onChange={(e) => setMantForm({ ...mantForm, tipo: e.target.value })} className={inputCls}>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CALIBRACION">Calibración</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input type="date" required value={mantForm.fecha} onChange={(e) => setMantForm({ ...mantForm, fecha: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción / notas</label>
                <textarea
                  value={mantForm.descripcion}
                  onChange={(e) => setMantForm({ ...mantForm, descripcion: e.target.value })}
                  rows={3}
                  className={inputCls}
                  placeholder="Qué se hizo, piezas reemplazadas, observaciones…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado final del equipo</label>
                <select value={mantForm.nuevoEstado} onChange={(e) => setMantForm({ ...mantForm, nuevoEstado: e.target.value })} className={inputCls}>
                  <option value="ACTIVO">Activo — listo para uso</option>
                  <option value="EN_MANTENIMIENTO">Aún en mantenimiento</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Registrar mantenimiento"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalTarea(null)}
                  className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TareaCard({
  tarea: t,
  onNavigate,
  onTomar,
  onMantenimiento,
}: {
  tarea: Tarea;
  onNavigate: () => void;
  onTomar?: () => void;
  onMantenimiento?: () => void;
}) {
  const cfg = TAREA_ESTADO_CFG[t.estado] ?? { label: t.estado, badge: "bg-slate-100 text-slate-600", icon: Clock };
  const isPast = new Date(t.fecha) < new Date() && t.estado === "PENDIENTE";

  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 p-5 ${isPast ? "ring-amber-300" : "ring-slate-200"}`}>
      <div className="flex items-start gap-4">
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
              {t.tipo === "PREVENTIVO" ? "Preventivo" : t.tipo === "CORRECTIVO" ? "Correctivo" : "Calibración"}
            </span>
            {isPast && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle size={10} /> Pendiente de completar
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {onMantenimiento && (
              <button
                onClick={(e) => { e.stopPropagation(); onMantenimiento(); }}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
              >
                <Plus size={11} /> Registrar mantenimiento
              </button>
            )}
            {onTomar && (
              <button
                onClick={(e) => { e.stopPropagation(); onTomar(); }}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <RefreshCw size={11} /> Tomar
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors ml-auto"
            >
              Ver equipo <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
