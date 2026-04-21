"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity, Search, CheckCircle, Wrench, AlertTriangle,
  MapPin, Filter, X, RefreshCw, Plus, Pencil, ChevronDown, ChevronRight, LayoutList, Layers, QrCode,
} from "lucide-react";
import QRModal from "./QRModal";

interface Equipo {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaAdquisicion?: string;
  ubicacion?: string;
  estado: string;
  descripcion?: string;
  mantenimientos: { fecha: string }[];
  _count: { mantenimientos: number };
}

const ESTADO_CFG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600 ring-1 ring-red-200",             dot: "bg-red-500",    icon: AlertTriangle },
};

const emptyForm = { nombre: "", marca: "", modelo: "", numeroSerie: "", fechaAdquisicion: "", ubicacion: "", estado: "ACTIVO", descripcion: "" };
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

function EquipoRow({ eq, onEdit, onQR }: { eq: Equipo; onEdit: (eq: Equipo) => void; onQR: (eq: Equipo) => void }) {
  const cfg = ESTADO_CFG[eq.estado] ?? { label: eq.estado, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Activity };
  const Icon = cfg.icon;
  const ultimo = eq.mantenimientos[eq.mantenimientos.length - 1];
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
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
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${cfg.color}`}>
          <Icon size={11} />{cfg.label}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">
        {ultimo ? new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "Sin registro"}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onQR(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Ver QR">
            <QrCode size={14} />
          </button>
          <button onClick={() => onEdit(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Editar">
            <Pencil size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AreaGroup({ area, equipos, onEdit, onQR, defaultOpen }: { area: string; equipos: Equipo[]; onEdit: (eq: Equipo) => void; onQR: (eq: Equipo) => void; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const activos = equipos.filter((e) => e.estado === "ACTIVO").length;
  const enMant  = equipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length;
  const fuera   = equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
          <MapPin size={14} className="text-red-500" />
          <span className="font-semibold text-slate-800 text-sm">{area}</span>
          <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{equipos.length} equipos</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {activos > 0  && <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{activos} activos</span>}
          {enMant  > 0  && <span className="flex items-center gap-1 text-amber-700  bg-amber-50  ring-1 ring-amber-200  px-2 py-0.5 rounded-full font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-400  inline-block" />{enMant} en mant.</span>}
          {fuera   > 0  && <span className="flex items-center gap-1 text-red-600    bg-red-50    ring-1 ring-red-200    px-2 py-0.5 rounded-full font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500    inline-block" />{fuera} fuera</span>}
        </div>
      </button>
      {open && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dispositivo</th>
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">N° Serie</th>
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Último mantenimiento</th>
              <th className="px-6 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipos.map((eq) => <EquipoRow key={eq.id} eq={eq} onEdit={onEdit} onQR={onQR} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function InventarioPage() {
  const [equipos, setEquipos]             = useState<Equipo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterEstado, setFilterEstado]   = useState("TODOS");
  const [filterUbicacion, setFilterUbicacion] = useState("TODAS");
  const [viewMode, setViewMode]           = useState<"areas" | "lista">("areas");

  // Modals
  const [showNew, setShowNew]   = useState(false);
  const [editEq, setEditEq]     = useState<Equipo | null>(null);
  const [qrEquipo, setQrEquipo] = useState<Equipo | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then((r) => r.json());
    setEquipos(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ubicaciones = useMemo(() => {
    const s = new Set<string>();
    equipos.forEach((e) => { if (e.ubicacion) s.add(e.ubicacion); });
    return Array.from(s).sort();
  }, [equipos]);

  const filtered = useMemo(() => equipos.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.nombre.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q) || (e.numeroSerie ?? "").toLowerCase().includes(q) || (e.marca ?? "").toLowerCase().includes(q)) &&
      (filterEstado === "TODOS" || e.estado === filterEstado) &&
      (filterUbicacion === "TODAS" || e.ubicacion === filterUbicacion)
    );
  }), [equipos, search, filterEstado, filterUbicacion]);

  // Group by area
  const byArea = useMemo(() => {
    const map = new Map<string, Equipo[]>();
    filtered.forEach((e) => {
      const key = e.ubicacion || "Sin área";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = {
    total: equipos.length,
    activos: equipos.filter((e) => e.estado === "ACTIVO").length,
    enMant: equipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length,
    fuera: equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length,
  };

  const openNew = () => { setForm(emptyForm); setFormError(""); setShowNew(true); };

  const openEdit = (eq: Equipo) => {
    setForm({
      nombre: eq.nombre,
      marca: eq.marca ?? "",
      modelo: eq.modelo ?? "",
      numeroSerie: eq.numeroSerie ?? "",
      fechaAdquisicion: eq.fechaAdquisicion ? new Date(eq.fechaAdquisicion).toISOString().slice(0, 10) : "",
      ubicacion: eq.ubicacion ?? "",
      estado: eq.estado,
      descripcion: eq.descripcion ?? "",
    });
    setFormError("");
    setEditEq(eq);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError("");
    const res = editEq
      ? await fetch(`/api/equipos/${editEq.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/equipos",               { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      await load();
      setShowNew(false);
      setEditEq(null);
    } else {
      const d = await res.json();
      setFormError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  };

  const closeModal = () => { setShowNew(false); setEditEq(null); };
  const isFiltering = filterEstado !== "TODOS" || filterUbicacion !== "TODAS" || search;

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Activity size={16} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Inventario de Dispositivos</h1>
          {!loading && <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{equipos.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode("areas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "areas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Layers size={13} /> Por área
            </button>
            <button onClick={() => setViewMode("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "lista" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <LayoutList size={13} /> Lista
            </button>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <Plus size={15} /> Nuevo dispositivo
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total equipos",     value: stats.total,   color: "text-slate-700",   bg: "bg-slate-50" },
            { label: "Activos",           value: stats.activos, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "En mantenimiento",  value: stats.enMant,  color: "text-amber-700",   bg: "bg-amber-50" },
            { label: "Fuera de servicio", value: stats.fuera,   color: "text-red-600",     bg: "bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 ring-1 ring-slate-200`}>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{loading ? "…" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo, serie, ubicación…"
              className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-red-500" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
            </select>
          </div>
          <select value={filterUbicacion} onChange={(e) => setFilterUbicacion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="TODAS">Todas las áreas</option>
            {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {isFiltering && (
            <button onClick={() => { setSearch(""); setFilterEstado("TODOS"); setFilterUbicacion("TODAS"); }} className="text-sm text-red-600 hover:text-red-800 font-medium">
              Limpiar
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
            <Activity size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No se encontraron equipos</p>
          </div>
        ) : viewMode === "areas" ? (
          /* ── Vista por área ── */
          <div>
            {byArea.map(([area, eqs], idx) => (
              <AreaGroup key={area} area={area} equipos={eqs} onEdit={openEdit} onQR={setQrEquipo} defaultOpen={idx === 0 || isFiltering as boolean} />
            ))}
          </div>
        ) : (
          /* ── Vista lista plana ── */
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispositivo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Serie</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Área</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Último mantenimiento</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eq) => {
                  const cfg = ESTADO_CFG[eq.estado] ?? { label: eq.estado, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: Activity };
                  const Icon = cfg.icon;
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
                        {eq.ubicacion
                          ? <span className="flex items-center gap-1 text-sm text-slate-600"><MapPin size={12} className="text-slate-400" />{eq.ubicacion}</span>
                          : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${cfg.color}`}>
                          <Icon size={11} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {ultimo ? new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "Sin registro"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQrEquipo(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Ver QR">
                            <QrCode size={14} />
                          </button>
                          <button onClick={() => openEdit(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Editar">
                            <Pencil size={14} />
                          </button>
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

      {/* QR Modal */}
      {qrEquipo && <QRModal equipo={qrEquipo} onClose={() => setQrEquipo(null)} />}

      {/* Modal nuevo / editar */}
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
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Monitor de signos vitales" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                  <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className={inputCls} placeholder="Philips" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                  <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Número de serie</label>
                  <input value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de adquisición</label>
                  <input type="date" value={form.fechaAdquisicion} onChange={(e) => setForm({ ...form, fechaAdquisicion: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Área / Ubicación</label>
                  <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className={inputCls} placeholder="Sala de Choque" list="ubicaciones-list" />
                  <datalist id="ubicaciones-list">
                    {ubicaciones.map((u) => <option key={u} value={u} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inputCls}>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls + " resize-none"} />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
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
