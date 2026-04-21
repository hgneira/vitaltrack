"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Plus, Search, ArrowRight, AlertTriangle, TrendingDown } from "lucide-react";

interface Medicamento {
  id: string;
  nombre: string;
  principioActivo?: string;
  presentacion?: string;
  concentracion?: string;
  stock: number;
  stockMinimo: number;
  unidad?: string;
  precio?: number;
  ubicacion?: string;
  _count: { movimientos: number };
}

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const emptyForm = { nombre: "", principioActivo: "", presentacion: "", concentracion: "", stock: "0", stockMinimo: "5", unidad: "", precio: "", ubicacion: "" };

export default function FarmaciaPage() {
  const router = useRouter();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await fetch("/api/medicamentos").then((r) => r.json());
    setMedicamentos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = medicamentos.filter((m) => {
    const q = search.toLowerCase();
    return m.nombre.toLowerCase().includes(q) || (m.principioActivo ?? "").toLowerCase().includes(q);
  });

  const bajoStock = medicamentos.filter((m) => m.stock <= m.stockMinimo);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/medicamentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { await load(); setShowForm(false); setForm(emptyForm); }
    else { const d = await res.json(); setError(d.error ?? "Error"); }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Pill size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Farmacia</h1>
          {!loading && <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{medicamentos.length}</span>}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
          <Plus size={15} /> Nuevo medicamento
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Low stock alert */}
        {bajoStock.length > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{bajoStock.length} medicamento{bajoStock.length > 1 ? "s" : ""}</span> con stock bajo o agotado: {bajoStock.map((m) => m.nombre).join(", ")}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar medicamento…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicamento</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Presentación</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => {
                  const stockBajo = m.stock <= m.stockMinimo;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stockBajo ? "bg-amber-50" : "bg-emerald-50"}`}>
                            <Pill size={15} className={stockBajo ? "text-amber-500" : "text-emerald-500"} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{m.nombre}</p>
                            {m.principioActivo && <p className="text-xs text-slate-500">{m.principioActivo}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {[m.presentacion, m.concentracion].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${stockBajo ? "text-amber-600" : "text-slate-900"}`}>
                            {m.stock} {m.unidad ?? ""}
                          </span>
                          {stockBajo && <TrendingDown size={13} className="text-amber-500" />}
                        </div>
                        <p className="text-xs text-slate-400">Mín: {m.stockMinimo}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {m.precio ? `$${m.precio.toLocaleString("es-MX")}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{m.ubicacion || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => router.push(`/dashboard/farmacia/${m.id}`)}
                          className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          Gestionar <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <Pill size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500">No hay medicamentos registrados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Nuevo medicamento</h2>
              <button onClick={() => setShowForm(false)}><Pill size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="Paracetamol 500mg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Principio activo</label>
                  <input value={form.principioActivo} onChange={(e) => setForm({ ...form, principioActivo: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Presentación</label>
                  <input value={form.presentacion} onChange={(e) => setForm({ ...form, presentacion: e.target.value })} className={inputClass} placeholder="Tabletas, Cápsulas…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Concentración</label>
                  <input value={form.concentracion} onChange={(e) => setForm({ ...form, concentracion: e.target.value })} className={inputClass} placeholder="500mg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
                  <input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className={inputClass} placeholder="Cajas, Frascos…" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stock inicial</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stock mínimo</label>
                  <input type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Precio</label>
                  <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className={inputClass} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ubicación en farmacia</label>
                <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className={inputClass} placeholder="Anaquel A-3" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Registrar medicamento"}
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
