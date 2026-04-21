"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, X, AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface Alerta {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: string;
  prioridad: string;
  estado: string;
  createdAt: string;
  area?: { nombre: string };
  creadaPor: { nombre: string; apellidos?: string; rol: string };
}

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  BAJA: { label: "Baja", color: "bg-slate-100 text-slate-600" },
  MEDIA: { label: "Media", color: "bg-blue-100 text-blue-700" },
  ALTA: { label: "Alta", color: "bg-amber-100 text-amber-700" },
  URGENTE: { label: "Urgente", color: "bg-red-100 text-red-600" },
};

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDIENTE: { label: "Pendiente", icon: Clock, color: "bg-amber-100 text-amber-700" },
  EN_PROCESO: { label: "En proceso", icon: AlertTriangle, color: "bg-blue-100 text-blue-700" },
  RESUELTA: { label: "Resuelta", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
};

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("PENDIENTE");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", areaId: "", tipo: "LIMPIEZA", prioridad: "MEDIA" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [alertData, areaData] = await Promise.all([
      fetch(`/api/alertas${filtro !== "TODAS" ? `?estado=${filtro}` : ""}`).then((r) => r.json()),
      fetch("/api/areas").then((r) => r.json()),
    ]);
    setAlertas(Array.isArray(alertData) ? alertData : []);
    setAreas(Array.isArray(areaData) ? areaData : []);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [filtro]);

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch("/api/alertas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado }) });
    await load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/alertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load();
    setShowForm(false);
    setForm({ titulo: "", descripcion: "", areaId: "", tipo: "LIMPIEZA", prioridad: "MEDIA" });
    setSaving(false);
  };

  const FilterBtn = ({ val, label }: { val: string; label: string }) => (
    <button onClick={() => setFiltro(val)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === val ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Alertas</h1>
          {!loading && <span className="ml-1 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{alertas.length}</span>}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-600">
          <Plus size={15} /> Nueva alerta
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <FilterBtn val="PENDIENTE" label="Pendientes" />
          <FilterBtn val="EN_PROCESO" label="En proceso" />
          <FilterBtn val="RESUELTA" label="Resueltas" />
          <FilterBtn val="TODAS" label="Todas" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
            <Bell size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No hay alertas en este estado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((a) => {
              const prioridadCfg = PRIORIDAD_CONFIG[a.prioridad] ?? { label: a.prioridad, color: "bg-slate-100 text-slate-600" };
              const estadoCfg = ESTADO_CONFIG[a.estado] ?? { label: a.estado, icon: Clock, color: "bg-slate-100 text-slate-600" };
              const EstadoIcon = estadoCfg.icon;

              return (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prioridadCfg.color}`}>{prioridadCfg.label}</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estadoCfg.color}`}>
                          <EstadoIcon size={10} /> {estadoCfg.label}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a.tipo}</span>
                        {a.area && <span className="text-xs text-slate-500">📍 {a.area.nombre}</span>}
                      </div>
                      <h3 className="font-semibold text-slate-900">{a.titulo}</h3>
                      {a.descripcion && <p className="text-sm text-slate-600 mt-1">{a.descripcion}</p>}
                      <p className="text-xs text-slate-400 mt-2">
                        Creada por {a.creadaPor.nombre} {a.creadaPor.apellidos} · {new Date(a.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {a.estado === "PENDIENTE" && (
                        <button onClick={() => cambiarEstado(a.id, "EN_PROCESO")}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap">
                          Tomar
                        </button>
                      )}
                      {a.estado === "EN_PROCESO" && (
                        <button onClick={() => cambiarEstado(a.id, "RESUELTA")}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Nueva alerta</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Título *</label>
                <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputClass} placeholder="Ej: Limpieza urgente en baño" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
                    <option value="LIMPIEZA">Limpieza</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="EMERGENCIA">Emergencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prioridad</label>
                  <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className={inputClass}>
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Área (opcional)</label>
                <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} className={inputClass}>
                  <option value="">Sin área específica</option>
                  {areas.map((ar) => <option key={ar.id} value={ar.id}>{ar.nombre}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                  {saving ? "Enviando…" : "Enviar alerta"}
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
