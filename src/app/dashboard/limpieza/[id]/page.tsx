"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, SprayCan, Plus, X, Clock, CheckCircle } from "lucide-react";

interface Area {
  id: string;
  nombre: string;
  piso?: string;
  tipo: string;
}

interface Registro {
  id: string;
  tipo: string;
  descripcion?: string;
  fecha: string;
  user: { nombre: string; apellidos?: string };
  area: { nombre: string };
}

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  LIMPIEZA: { label: "Limpieza", color: "bg-cyan-100 text-cyan-700" },
  MANTENIMIENTO_GENERAL: { label: "Mantenimiento", color: "bg-amber-100 text-amber-700" },
  INSPECCION: { label: "Inspección", color: "bg-violet-100 text-violet-700" },
};

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function AreaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const [area, setArea] = useState<Area | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "LIMPIEZA", descripcion: "" });
  const [saving, setSaving] = useState(false);

  const loadRegistros = async () => {
    const data = await fetch(`/api/areas/${params.id}/registros`).then((r) => r.json());
    setRegistros(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/areas").then((r) => r.json()),
      fetch(`/api/areas/${params.id}/registros`).then((r) => r.json()),
    ]).then(([areasData, regData]) => {
      const found = Array.isArray(areasData) ? areasData.find((a: Area) => a.id === params.id) : null;
      setArea(found ?? null);
      setRegistros(Array.isArray(regData) ? regData : []);
      setLoading(false);
    });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/areas/${params.id}/registros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await loadRegistros();
    setShowForm(false);
    setForm({ tipo: "LIMPIEZA", descripcion: "" });
    setSaving(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/limpieza")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Áreas
        </button>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
          <Plus size={15} /> Registrar
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Area header */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
              <SprayCan size={22} className="text-cyan-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{area?.nombre ?? params.id}</h1>
              <p className="text-sm text-slate-500">{area?.piso ?? ""}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-slate-900">{registros.length}</p>
              <p className="text-xs text-slate-500">registros</p>
            </div>
          </div>

          {/* Registros */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Historial</h2>
            </div>
            {registros.length === 0 ? (
              <div className="p-8 text-center">
                <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay registros aún</p>
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                  Registrar primera actividad →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {registros.map((r) => {
                  const tCfg = TIPO_LABELS[r.tipo] ?? { label: r.tipo, color: "bg-slate-100 text-slate-600" };
                  return (
                    <div key={r.id} className="px-6 py-4 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={14} className="text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tCfg.color}`}>{tCfg.label}</span>
                          <span className="text-xs text-slate-500">{r.user.nombre} {r.user.apellidos}</span>
                        </div>
                        {r.descripcion && <p className="text-sm text-slate-700">{r.descripcion}</p>}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(r.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Registrar actividad</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
                  <option value="LIMPIEZA">Limpieza</option>
                  <option value="MANTENIMIENTO_GENERAL">Mantenimiento general</option>
                  <option value="INSPECCION">Inspección</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className={inputClass} placeholder="Descripción opcional…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Registrar"}
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
