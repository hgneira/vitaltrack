"use client";

import { useEffect, useState, useMemo } from "react";
import { Wrench, AlertTriangle, MapPin, RefreshCw, Plus, X } from "lucide-react";

interface Mant {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string;
  tecnico?: string;
  costo?: number;
  proximoMantenimiento?: string;
}
interface Equipo {
  id: string;
  nombre: string;
  ubicacion?: string;
  estado: string;
  mantenimientos: Mant[];
}

const TIPO: Record<string, { label: string; color: string }> = {
  PREVENTIVO: { label: "Preventivo", color: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200" },
  CORRECTIVO: { label: "Correctivo", color: "bg-red-100 text-red-700 ring-1 ring-red-200" },
  INSPECCION: { label: "Inspección", color: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" },
};

const emptyMant = { equipoId: "", tipo: "PREVENTIVO", fecha: new Date().toISOString().slice(0, 10), descripcion: "", tecnico: "", costo: "", proximoMantenimiento: "", nuevoEstado: "" };
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

export default function MantenimientoPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMant);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then((r) => r.json());
    setEquipos(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const allMants = useMemo(() => {
    const list: { equipo: Equipo; mant: Mant }[] = [];
    equipos.forEach((e) => e.mantenimientos.forEach((m) => list.push({ equipo: e, mant: m })));
    return list.sort((a, b) => new Date(b.mant.fecha).getTime() - new Date(a.mant.fecha).getTime());
  }, [equipos]);

  const alertas = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    return allMants
      .filter(({ mant }) => mant.proximoMantenimiento && new Date(mant.proximoMantenimiento) <= in30)
      .map(({ equipo, mant }) => ({ equipo, mant, overdue: new Date(mant.proximoMantenimiento!) < now }))
      .sort((a, b) => new Date(a.mant.proximoMantenimiento!).getTime() - new Date(b.mant.proximoMantenimiento!).getTime());
  }, [allMants]);

  const openForm = (equipoId = "") => {
    setForm({ ...emptyMant, equipoId });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipoId) { setFormError("Selecciona un dispositivo"); return; }
    setSaving(true); setFormError("");
    const body: Record<string, unknown> = {
      tipo: form.tipo,
      fecha: form.fecha,
      descripcion: form.descripcion || null,
      tecnico: form.tecnico || null,
      costo: form.costo ? Number(form.costo) : null,
      proximoMantenimiento: form.proximoMantenimiento || null,
      nuevoEstado: form.nuevoEstado || null,
    };
    const res = await fetch(`/api/equipos/${form.equipoId}/mantenimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await load();
      setShowForm(false);
    } else {
      const d = await res.json();
      setFormError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Wrench size={16} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Historial de Mantenimiento</h1>
          {!loading && <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{allMants.length} registros</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => openForm()} className="flex items-center gap-2 bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
            <Plus size={15} /> Registrar mantenimiento
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Alertas */}
            {alertas.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  Alertas de vencimiento ({alertas.length})
                </h2>
                <div className="space-y-2">
                  {alertas.map(({ equipo, mant, overdue }) => (
                    <div key={mant.id} className={`flex items-center justify-between px-5 py-3 rounded-xl ring-1 ${overdue ? "bg-red-50 ring-red-200" : "bg-amber-50 ring-amber-200"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${overdue ? "bg-red-500" : "bg-amber-400"}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{equipo.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {equipo.ubicacion && <><MapPin size={10} className="inline mr-0.5" />{equipo.ubicacion} · </>}
                            {TIPO[mant.tipo]?.label ?? mant.tipo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${overdue ? "text-red-600" : "text-amber-700"}`}>{overdue ? "VENCIDO" : "Por vencer"}</p>
                          <p className="text-xs text-slate-500">{new Date(mant.proximoMantenimiento!).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <button onClick={() => openForm(equipo.id)}
                          className="text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                          + Registrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Historial completo ({allMants.length} registros)</h2>
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Técnico</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Próximo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMants.map(({ equipo, mant }) => {
                      const tipo = TIPO[mant.tipo] ?? { label: mant.tipo, color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
                      return (
                        <tr key={mant.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900">{equipo.nombre}</p>
                            {equipo.ubicacion && <p className="text-xs text-slate-400">{equipo.ubicacion}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tipo.color}`}>{tipo.label}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {new Date(mant.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{mant.tecnico || "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {mant.proximoMantenimiento
                              ? new Date(mant.proximoMantenimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{mant.descripcion || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {allMants.length === 0 && (
                  <div className="p-12 text-center">
                    <Wrench size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">Sin registros de mantenimiento</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal registrar mantenimiento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Registrar mantenimiento</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dispositivo *</label>
                <select required value={form.equipoId} onChange={(e) => setForm({ ...form, equipoId: e.target.value })} className={inputCls}>
                  <option value="">Selecciona un dispositivo…</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}{eq.ubicacion ? ` — ${eq.ubicacion}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="INSPECCION">Inspección</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Técnico</label>
                  <input value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} className={inputCls} placeholder="Nombre del técnico" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Costo (MXN)</label>
                  <input type="number" min="0" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className={inputCls} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label>
                <input type="date" value={form.proximoMantenimiento} onChange={(e) => setForm({ ...form, proximoMantenimiento: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado del equipo</label>
                <select value={form.nuevoEstado} onChange={(e) => setForm({ ...form, nuevoEstado: e.target.value })} className={inputCls}>
                  <option value="">No cambiar</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción / Observaciones</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className={inputCls + " resize-none"} placeholder="Detalle del trabajo realizado…" />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Registrar mantenimiento"}
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
