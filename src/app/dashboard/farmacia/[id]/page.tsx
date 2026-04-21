"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pill, Plus, X, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";

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
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  precio?: number;
  motivo?: string;
  pacienteNombre?: string;
  createdAt: string;
  user: { nombre: string; apellidos?: string };
}

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ENTRADA: { label: "Entrada", color: "bg-emerald-100 text-emerald-700", icon: TrendingUp },
  SALIDA: { label: "Salida", color: "bg-red-100 text-red-600", icon: TrendingDown },
  AJUSTE: { label: "Ajuste", color: "bg-blue-100 text-blue-700", icon: ArrowUpDown },
};

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function FarmaciaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const [med, setMed] = useState<Medicamento | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "ENTRADA", cantidad: "", precio: "", motivo: "", pacienteNombre: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [medsData, movData] = await Promise.all([
      fetch("/api/medicamentos").then((r) => r.json()),
      fetch(`/api/medicamentos/${params.id}/movimientos`).then((r) => r.json()),
    ]);
    const found = Array.isArray(medsData) ? medsData.find((m: Medicamento) => m.id === params.id) : null;
    setMed(found ?? null);
    setMovimientos(Array.isArray(movData) ? movData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/medicamentos/${params.id}/movimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await load();
      setShowForm(false);
      setForm({ tipo: "ENTRADA", cantidad: "", precio: "", motivo: "", pacienteNombre: "" });
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
    setSaving(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!med) return <div className="h-full flex items-center justify-center"><p className="text-slate-500">Medicamento no encontrado</p></div>;

  const entradas = movimientos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.cantidad, 0);
  const salidas = movimientos.filter((m) => m.tipo === "SALIDA").reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/farmacia")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Farmacia
        </button>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
          <Plus size={15} /> Registrar movimiento
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${med.stock <= med.stockMinimo ? "bg-amber-50" : "bg-emerald-50"}`}>
              <Pill size={24} className={med.stock <= med.stockMinimo ? "text-amber-500" : "text-emerald-500"} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{med.nombre}</h1>
              <p className="text-sm text-slate-500">{[med.principioActivo, med.presentacion, med.concentracion].filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Stock actual", value: `${med.stock} ${med.unidad ?? ""}`, color: med.stock <= med.stockMinimo ? "text-amber-600" : "text-emerald-600" },
              { label: "Stock mínimo", value: med.stockMinimo, color: "text-slate-700" },
              { label: "Total entradas", value: entradas, color: "text-emerald-600" },
              { label: "Total salidas", value: salidas, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detalles</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Precio unitario", med.precio ? `$${med.precio.toLocaleString("es-MX")}` : "—"], ["Ubicación", med.ubicacion || "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Movimientos */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Historial de movimientos</h2>
            </div>
            {movimientos.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowUpDown size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {movimientos.map((m) => {
                  const cfg = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, color: "bg-slate-100 text-slate-600", icon: ArrowUpDown };
                  const Icon = cfg.icon;
                  return (
                    <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-sm font-bold text-slate-900">
                            {m.tipo === "SALIDA" ? "-" : "+"}{m.cantidad} {med.unidad ?? ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {m.motivo && `${m.motivo} · `}
                          {m.pacienteNombre && `Paciente: ${m.pacienteNombre} · `}
                          {m.user.nombre} {m.user.apellidos}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {m.precio && <p className="text-xs font-medium text-slate-700">${m.precio.toLocaleString("es-MX")}</p>}
                        <p className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
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
              <h2 className="font-semibold text-slate-900">Registrar movimiento</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleMovimiento} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
                    <option value="ENTRADA">Entrada (llegó stock)</option>
                    <option value="SALIDA">Salida (dispensado)</option>
                    <option value="AJUSTE">Ajuste de inventario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cantidad *</label>
                  <input required type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className={inputClass} />
                </div>
              </div>
              {form.tipo === "SALIDA" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del paciente</label>
                  <input value={form.pacienteNombre} onChange={(e) => setForm({ ...form, pacienteNombre: e.target.value })} className={inputClass} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Precio total</label>
                  <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Motivo / Nota</label>
                  <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={inputClass} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
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
