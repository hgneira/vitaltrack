"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Building2, ArrowLeft, Search, X, RefreshCw, Plus, QrCode, Wrench,
  ExternalLink, Pencil, Activity, CheckCircle, AlertTriangle, Filter,
  ChevronDown, ChevronUp, Clock, ClipboardList, Stethoscope,
  FlaskConical, Scissors, HeartPulse,
} from "lucide-react";
import QRModal from "./QRModal";

// ─── area catalog ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  {
    id: "clinicas",
    nombre: "Áreas Clínicas",
    icon: Stethoscope,
    colors: {
      section: "bg-blue-600", card: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500", ring: "ring-blue-200", text: "text-blue-700",
    },
    areas: [
      "Medicina interna", "Cirugía general", "Pediatría",
      "Ginecología y obstetricia", "Traumatología y ortopedia",
      "Unidad de cuidados intensivos (UCI)",
      "Unidad de cuidados intensivos neonatales (UCIN)",
      "Hospitalización general",
    ],
  },
  {
    id: "diagnostico",
    nombre: "Apoyo Diagnóstico",
    icon: FlaskConical,
    colors: {
      section: "bg-violet-600", card: "bg-violet-50 border-violet-200", badge: "bg-violet-100 text-violet-700",
      dot: "bg-violet-500", ring: "ring-violet-200", text: "text-violet-700",
    },
    areas: [
      "Laboratorio clínico general", "Radiología e imagen",
      "Ultrasonido", "Electrocardiografía", "Banco de sangre",
    ],
  },
  {
    id: "quirurgicas",
    nombre: "Áreas Quirúrgicas",
    icon: Scissors,
    colors: {
      section: "bg-rose-600", card: "bg-rose-50 border-rose-200", badge: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500", ring: "ring-rose-200", text: "text-rose-700",
    },
    areas: [
      "Quirófano", "Central de equipos y esterilización (CEYE)",
      "Sala de recuperación post-quirúrgica",
    ],
  },
  {
    id: "apoyo",
    nombre: "Apoyo Hospitalario",
    icon: HeartPulse,
    colors: {
      section: "bg-emerald-600", card: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-700",
    },
    areas: ["Farmacia", "Almacén general", "Central de enfermeras general"],
  },
] as const;

type Cat = typeof CATEGORIAS[number];

const ALL_AREAS = CATEGORIAS.flatMap(c => c.areas as unknown as string[]);
function catOfArea(area: string) {
  return CATEGORIAS.find(c => (c.areas as unknown as string[]).includes(area))!;
}

// ─── types ────────────────────────────────────────────────────────────────────
interface Equipo {
  id: string; nombre: string; marca?: string; modelo?: string;
  numeroSerie?: string; fechaAdquisicion?: string; ubicacion?: string;
  estado: string; descripcion?: string;
  mantenimientos: { fecha: string }[];
  _count: { mantenimientos: number };
}
interface Mant {
  id: string; tipo: string; fecha: string; tecnico?: string;
  descripcion?: string; costo?: number; proximoMantenimiento?: string;
}

// ─── constants ───────────────────────────────────────────────────────────────
const ESTADO_CFG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600 ring-1 ring-red-200",             dot: "bg-red-500",    icon: AlertTriangle },
};
const TIPO_MANT = ["PREVENTIVO", "CORRECTIVO", "CALIBRACION", "LIMPIEZA", "VERIFICACION"] as const;
const emptyMant = { tipo: "PREVENTIVO", fecha: new Date().toISOString().slice(0, 10), tecnico: "", descripcion: "", costo: "", proximoMantenimiento: "", nuevoEstado: "" };
const emptyForm = { nombre: "", marca: "", modelo: "", numeroSerie: "", fechaAdquisicion: "", ubicacion: "", estado: "ACTIVO", descripcion: "" };
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ estado, onChange }: { estado: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = ESTADO_CFG[estado] ?? { label: estado, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Activity };
  const Icon = cfg.icon;
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative w-fit">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-75 transition-opacity ${cfg.color}`}>
        <Icon size={11} /> {cfg.label} <ChevronDown size={10} className="ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 overflow-hidden min-w-max">
          {Object.entries(ESTADO_CFG).map(([key, c]) => {
            const CI = c.icon;
            return (
              <button key={key} onClick={() => { onChange(key); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${estado === key ? "opacity-40 cursor-default pointer-events-none" : ""}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} /> {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MantModal ───────────────────────────────────────────────────────────────
function MantModal({ equipo, onClose, onSaved }: { equipo: Equipo; onClose: () => void; onSaved: () => void }) {
  const [records, setRecords] = useState<Mant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMant);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    const d = await fetch(`/api/equipos/${equipo.id}/mantenimientos`).then(r => r.json());
    setRecords(Array.isArray(d) ? d : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const res = await fetch(`/api/equipos/${equipo.id}/mantenimientos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { await load(); setShowForm(false); setForm(emptyMant); onSaved(); }
    else { const d = await res.json(); setErr(d.error ?? "Error al guardar"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Wrench size={16} className="text-amber-500" /> Mantenimientos</h2>
            <p className="text-xs text-slate-500 mt-0.5">{equipo.nombre}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <button onClick={() => setShowForm(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium transition-colors ring-1 ring-amber-200">
            <span className="flex items-center gap-2"><Plus size={15} /> Registrar nuevo mantenimiento</span>
            {showForm ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showForm && (
            <form onSubmit={handleSave} className="bg-slate-50 rounded-xl p-5 space-y-4 ring-1 ring-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                    {TIPO_MANT.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Técnico</label>
                  <input value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })} className={inputCls} placeholder="Nombre del técnico" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Costo (MXN)</label>
                  <input type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} className={inputCls} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls + " resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label>
                  <input type="date" value={form.proximoMantenimiento} onChange={e => setForm({ ...form, proximoMantenimiento: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado</label>
                  <select value={form.nuevoEstado} onChange={e => setForm({ ...form, nuevoEstado: e.target.value })} className={inputCls}>
                    <option value="">Sin cambio</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar mantenimiento"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyMant); }} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-200 hover:bg-slate-300">Cancelar</button>
              </div>
            </form>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><ClipboardList size={13} /> Historial ({records.length})</p>
            {loading ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Sin registros de mantenimiento</div>
            ) : (
              <div className="space-y-2">
                {records.map(r => (
                  <div key={r.id} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Wrench size={13} className="text-amber-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">{r.tipo.charAt(0) + r.tipo.slice(1).toLowerCase()}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Clock size={11} />{new Date(r.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                      {r.tecnico && <p className="text-xs text-slate-500 mt-0.5">Técnico: {r.tecnico}</p>}
                      {r.descripcion && <p className="text-xs text-slate-500 mt-0.5 truncate">{r.descripcion}</p>}
                      {r.proximoMantenimiento && <p className="text-xs text-amber-600 mt-0.5">Próximo: {new Date(r.proximoMantenimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                    </div>
                    {r.costo != null && <span className="text-xs font-medium text-slate-600 shrink-0">${r.costo.toLocaleString("es-MX")}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function InventarioGeneralPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [qrEquipo, setQrEquipo] = useState<Equipo | null>(null);
  const [mantEquipo, setMantEquipo] = useState<Equipo | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editEq, setEditEq] = useState<Equipo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const d = await fetch("/api/equipos").then(r => r.json()).catch(() => []);
    setEquipos(Array.isArray(d) ? d.filter((e: Equipo) => ALL_AREAS.includes(e.ubicacion ?? "")) : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // equipment by area
  const equiposByArea = useMemo(() => {
    const map: Record<string, Equipo[]> = {};
    equipos.forEach(eq => {
      const key = eq.ubicacion ?? "";
      if (!map[key]) map[key] = [];
      map[key].push(eq);
    });
    return map;
  }, [equipos]);

  // area-level inventory (when area selected)
  const areaEquipos = useMemo(() => {
    if (!selectedArea) return [];
    return (equiposByArea[selectedArea] ?? []).filter(eq => {
      const q = search.toLowerCase();
      return (
        (eq.nombre.toLowerCase().includes(q) || (eq.numeroSerie ?? "").toLowerCase().includes(q) || (eq.marca ?? "").toLowerCase().includes(q)) &&
        (filterEstado === "TODOS" || eq.estado === filterEstado)
      );
    });
  }, [equiposByArea, selectedArea, search, filterEstado]);

  // global stats
  const globalStats = useMemo(() => ({
    total:   equipos.length,
    activos: equipos.filter(e => e.estado === "ACTIVO").length,
    enMant:  equipos.filter(e => e.estado === "EN_MANTENIMIENTO").length,
    fuera:   equipos.filter(e => e.estado === "FUERA_DE_SERVICIO").length,
  }), [equipos]);

  const handleStatusChange = async (id: string, newEstado: string) => {
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, estado: newEstado } : e));
    await fetch(`/api/equipos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: newEstado }) });
  };

  const openNew = () => {
    setForm({ ...emptyForm, ubicacion: selectedArea ?? "" });
    setFormError(""); setShowNew(true);
  };
  const openEdit = (eq: Equipo) => {
    setForm({ nombre: eq.nombre, marca: eq.marca ?? "", modelo: eq.modelo ?? "", numeroSerie: eq.numeroSerie ?? "", fechaAdquisicion: eq.fechaAdquisicion ? new Date(eq.fechaAdquisicion).toISOString().slice(0, 10) : "", ubicacion: eq.ubicacion ?? "", estado: eq.estado, descripcion: eq.descripcion ?? "" });
    setFormError(""); setEditEq(eq);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    const res = editEq
      ? await fetch(`/api/equipos/${editEq.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/equipos",               { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { await load(); setShowNew(false); setEditEq(null); }
    else { const d = await res.json(); setFormError(d.error ?? "Error al guardar"); }
    setSaving(false);
  };
  const closeModal = () => { setShowNew(false); setEditEq(null); };

  const selectArea = (area: string) => { setSelectedArea(area); setSearch(""); setFilterEstado("TODOS"); };
  const backToGrid = () => { setSelectedArea(null); setSearch(""); setFilterEstado("TODOS"); };

  // ── area stats helper
  const areaStats = (area: string) => {
    const eqs = equiposByArea[area] ?? [];
    return { total: eqs.length, activos: eqs.filter(e => e.estado === "ACTIVO").length, enMant: eqs.filter(e => e.estado === "EN_MANTENIMIENTO").length, fuera: eqs.filter(e => e.estado === "FUERA_DE_SERVICIO").length };
  };

  const currentCat = selectedArea ? catOfArea(selectedArea) : null;

  return (
    <div className="h-full flex flex-col">
      {/* ── header ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selectedArea && (
            <button onClick={backToGrid} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Building2 size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {selectedArea ?? "Inventario General del Hospital"}
            </h1>
            {selectedArea && currentCat && (
              <p className={`text-xs font-medium ${currentCat.colors.text}`}>{currentCat.nombre}</p>
            )}
          </div>
          {!loading && !selectedArea && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{equipos.length} equipos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
          {selectedArea && (
            <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={15} /> Nuevo dispositivo
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* ── global stats (grid view only) ── */}
        {!selectedArea && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total equipos",     value: globalStats.total,   color: "text-slate-700",   bg: "bg-slate-50" },
              { label: "Activos",           value: globalStats.activos, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "En mantenimiento",  value: globalStats.enMant,  color: "text-amber-700",   bg: "bg-amber-50" },
              { label: "Fuera de servicio", value: globalStats.fuera,   color: "text-red-600",     bg: "bg-red-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ring-slate-200`}>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{loading ? "…" : s.value}</p>
              </div>
            ))}
          </div>
        )}

        {loading && !selectedArea ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !selectedArea ? (
          /* ── CATEGORIES GRID VIEW ── */
          <div className="space-y-10">
            {CATEGORIAS.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.id}>
                  {/* category header */}
                  <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl ${cat.colors.section} text-white`}>
                    <Icon size={16} />
                    <span className="font-semibold text-sm">{cat.nombre}</span>
                    <span className="ml-auto text-xs font-medium opacity-80">
                      {(cat.areas as unknown as string[]).reduce((acc, a) => acc + (equiposByArea[a]?.length ?? 0), 0)} equipos
                    </span>
                  </div>
                  {/* area cards grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(cat.areas as unknown as string[]).map(area => {
                      const st = areaStats(area);
                      return (
                        <button key={area} onClick={() => selectArea(area)}
                          className={`text-left p-4 rounded-xl border-2 ${cat.colors.card} hover:shadow-md transition-all hover:-translate-y-0.5 group`}>
                          <p className="font-semibold text-slate-800 text-sm leading-snug mb-3 group-hover:text-slate-900">{area}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.colors.badge}`}>
                              {st.total} {st.total === 1 ? "equipo" : "equipos"}
                            </span>
                            {st.fuera > 0 && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-0.5">
                                <AlertTriangle size={9} /> {st.fuera}
                              </span>
                            )}
                            {st.enMant > 0 && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                                <Wrench size={9} /> {st.enMant}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── AREA INVENTORY VIEW ── */
          <div>
            {/* area stats */}
            {(() => {
              const st = areaStats(selectedArea);
              return (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total", value: st.total, color: "text-slate-700", bg: "bg-slate-50" },
                    { label: "Activos", value: st.activos, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "En mantenimiento", value: st.enMant, color: "text-amber-700", bg: "bg-amber-50" },
                    { label: "Fuera de servicio", value: st.fuera, color: "text-red-600", bg: "bg-red-50" },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ring-slate-200`}>
                      <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* filters */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo, serie, marca…"
                  className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-slate-400" />
                <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="TODOS">Todos los estados</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                </select>
              </div>
              {(search || filterEstado !== "TODOS") && (
                <button onClick={() => { setSearch(""); setFilterEstado("TODOS"); }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Limpiar</button>
              )}
              <span className="ml-auto text-xs text-slate-500">{areaEquipos.length} resultado{areaEquipos.length !== 1 ? "s" : ""}</span>
            </div>

            {/* table */}
            {areaEquipos.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-16 text-center">
                <Activity size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-500 font-medium mb-1">Sin dispositivos registrados</p>
                <p className="text-sm text-slate-400 mb-4">Agrega el primer dispositivo de esta área</p>
                <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700">
                  <Plus size={15} /> Nuevo dispositivo
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispositivo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Serie</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Último mantenimiento</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {areaEquipos.map(eq => {
                      const cfg = ESTADO_CFG[eq.estado] ?? { label: eq.estado, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Activity };
                      const ultimo = eq.mantenimientos[eq.mantenimientos.length - 1];
                      return (
                        <tr key={eq.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{eq.nombre}</p>
                                {(eq.marca || eq.modelo) && <p className="text-xs text-slate-400">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{eq.numeroSerie || "—"}</td>
                          <td className="px-6 py-4">
                            <StatusBadge estado={eq.estado} onChange={s => handleStatusChange(eq.id, s)} />
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {ultimo ? new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "Sin registro"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setQrEquipo(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Ver QR"><QrCode size={14} /></button>
                              <button onClick={() => setMantEquipo(eq)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Mantenimientos"><Wrench size={14} /></button>
                              <Link href={`/dashboard/equipos/${eq.id}`} className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Ver ficha completa"><ExternalLink size={14} /></Link>
                              <button onClick={() => openEdit(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Editar"><Pencil size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── modals ── */}
      {qrEquipo && <QRModal equipo={qrEquipo} onClose={() => setQrEquipo(null)} />}
      {mantEquipo && <MantModal equipo={mantEquipo} onClose={() => setMantEquipo(null)} onSaved={load} />}

      {(showNew || editEq) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">{editEq ? "Editar dispositivo" : "Nuevo dispositivo"}</h2>
              <button onClick={closeModal}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Monitor de signos vitales" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                  <input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className={inputCls} placeholder="Philips" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                  <input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">N° de serie</label>
                  <input value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de adquisición</label>
                  <input type="date" value={form.fechaAdquisicion} onChange={e => setForm({ ...form, fechaAdquisicion: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Área</label>
                  <select value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} className={inputCls}>
                    <option value="">Seleccionar área…</option>
                    {CATEGORIAS.map(cat => (
                      <optgroup key={cat.id} label={cat.nombre}>
                        {(cat.areas as unknown as string[]).map(a => <option key={a} value={a}>{a}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className={inputCls}>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls + " resize-none"} />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Guardando…" : editEq ? "Guardar cambios" : "Registrar dispositivo"}
                </button>
                <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
