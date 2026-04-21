"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Wrench, Plus, X, AlertTriangle, Stethoscope, Calendar, Pencil, Trash2 } from "lucide-react";

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
  mantenimientos: Mantenimiento[];
}

interface Mantenimiento {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string;
  tecnico?: string;
  costo?: number;
  proximoMantenimiento?: string;
}

interface Biomedico {
  id: string;
  nombre: string;
  apellidos?: string;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700" },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700" },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600" },
};

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent";

const RECURRENCIA_OPTIONS = [
  { value: "",            label: "Sin programar" },
  { value: "MENSUAL",     label: "Mensual" },
  { value: "TRIMESTRAL",  label: "Cada 3 meses" },
  { value: "SEMESTRAL",   label: "Cada 6 meses" },
  { value: "ANUAL",       label: "Anual" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

function calcNextDate(fromDate: string, recurrencia: string): string {
  const d = new Date(fromDate || new Date().toISOString().slice(0, 10));
  if (recurrencia === "MENSUAL")     { d.setMonth(d.getMonth() + 1); }
  else if (recurrencia === "TRIMESTRAL") { d.setMonth(d.getMonth() + 3); }
  else if (recurrencia === "SEMESTRAL")  { d.setMonth(d.getMonth() + 6); }
  else if (recurrencia === "ANUAL")      { d.setFullYear(d.getFullYear() + 1); }
  return d.toISOString().slice(0, 10);
}

const emptyForm = {
  tipo: "PREVENTIVO",
  fecha: new Date().toISOString().slice(0, 10),
  descripcion: "",
  tecnicoId: "",
  tecnicoActual: "",   // name of existing technician shown as hint when editing
  costo: "",
  recurrencia: "",
  proximoMantenimiento: "",
  nuevoEstado: "",
};

export default function DetalleEquipoPage() {
  const router = useRouter();
  const params = useParams();
  const equipoId = params.id as string;

  const [equipo,     setEquipo]     = useState<Equipo | null>(null);
  const [biomedicos, setBiomedicos] = useState<Biomedico[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Create / edit modal
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Mantenimiento | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // Equipment estado modal
  const [editEstado, setEditEstado] = useState<string | null>(null);

  const load = async () => {
    const data = await fetch(`/api/equipos/${equipoId}`).then((r) => r.json());
    setEquipo(data?.id ? data : null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/usuarios?rol=INGENIERIA_BIOMEDICA")
      .then((r) => r.json())
      .then((d) => setBiomedicos(Array.isArray(d) ? d : []));
  }, [equipoId]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (m: Mantenimiento) => {
    setEditingId(m.id);
    setForm({
      tipo:                 m.tipo,
      fecha:                m.fecha.slice(0, 10),
      descripcion:          m.descripcion ?? "",
      tecnicoId:            "",
      tecnicoActual:        m.tecnico ?? "",
      costo:                m.costo != null ? String(m.costo) : "",
      recurrencia:          "",
      proximoMantenimiento: m.proximoMantenimiento ? m.proximoMantenimiento.slice(0, 10) : "",
      nuevoEstado:          "",
    });
    setShowForm(true);
  };

  const handleFechaChange = (val: string) => {
    const newForm = { ...form, fecha: val };
    if (form.recurrencia && form.recurrencia !== "PERSONALIZADO") {
      newForm.proximoMantenimiento = calcNextDate(val, form.recurrencia);
    }
    setForm(newForm);
  };

  const handleRecurrenciaChange = (val: string) => {
    const newForm = { ...form, recurrencia: val };
    if (val && val !== "PERSONALIZADO") {
      newForm.proximoMantenimiento = calcNextDate(form.fecha, val);
    }
    // Don't clear proximoMantenimiento when selecting "Sin programar" — preserve existing date
    setForm(newForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = editingId
      ? `/api/equipos/${equipoId}/mantenimientos/${editingId}`
      : `/api/equipos/${equipoId}/mantenimientos`;
    const method = editingId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        recurrencia: form.recurrencia === "PERSONALIZADO" ? null : (form.recurrencia || null),
      }),
    });

    await load();
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/equipos/${equipoId}/mantenimientos/${deleteTarget.id}`, { method: "DELETE" });
    await load();
    setDeleteTarget(null);
    setDeleting(false);
  };

  const updateEstado = async () => {
    if (!editEstado || !equipo) return;
    await fetch(`/api/equipos/${equipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...equipo, estado: editEstado }),
    });
    await load();
    setEditEstado(null);
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!equipo) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-500">Equipo no encontrado</p>
    </div>
  );

  const estadoCfg = ESTADO_CONFIG[equipo.estado] ?? { label: equipo.estado, color: "bg-slate-100 text-slate-600" };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/biomedica")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Equipo Médico
        </button>
        <button onClick={openNew} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
          <Plus size={15} /> Registrar mantenimiento
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Header card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Stethoscope size={24} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">{equipo.nombre}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estadoCfg.color}`}>{estadoCfg.label}</span>
                <button onClick={() => setEditEstado(equipo.estado)} className="text-xs text-cyan-600 hover:text-cyan-800 font-medium">
                  Cambiar estado
                </button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Información</h2>
              <div className="space-y-3 text-sm">
                {([
                  ["N° Serie",    equipo.numeroSerie],
                  ["Ubicación",   equipo.ubicacion],
                  ["Adquisición", equipo.fechaAdquisicion ? new Date(equipo.fechaAdquisicion).toLocaleDateString("es-MX") : null],
                ] as [string, string | null | undefined][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{val || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estadísticas</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total mantenimientos</span>
                  <span className="font-medium text-slate-900">{equipo.mantenimientos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Preventivos</span>
                  <span className="font-medium text-slate-900">{equipo.mantenimientos.filter((m) => m.tipo === "PREVENTIVO").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Correctivos</span>
                  <span className="font-medium text-slate-900">{equipo.mantenimientos.filter((m) => m.tipo === "CORRECTIVO").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inspecciones</span>
                  <span className="font-medium text-slate-900">{equipo.mantenimientos.filter((m) => m.tipo === "INSPECCION").length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance history */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Wrench size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-900">Historial de mantenimiento</h2>
            </div>
            {equipo.mantenimientos.length === 0 ? (
              <div className="p-8 text-center">
                <Wrench size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay registros de mantenimiento</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {equipo.mantenimientos.map((m) => (
                  <div key={m.id} className="px-6 py-4 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.tipo === "PREVENTIVO" ? "bg-blue-100 text-blue-700" :
                            m.tipo === "CORRECTIVO" ? "bg-orange-100 text-orange-700" :
                            "bg-violet-100 text-violet-700"
                          }`}>
                            {m.tipo === "PREVENTIVO" ? "Preventivo" : m.tipo === "CORRECTIVO" ? "Correctivo" : "Inspección"}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(m.fecha).toLocaleDateString("es-MX")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{m.descripcion || "Sin descripción"}</p>
                        {m.tecnico && <p className="text-xs text-slate-500 mt-1">Técnico: {m.tecnico}</p>}
                        {m.proximoMantenimiento && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Próximo: {new Date(m.proximoMantenimiento).toLocaleDateString("es-MX")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.costo != null && (
                          <span className="text-sm font-semibold text-slate-900">${m.costo.toLocaleString("es-MX")}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change equipment estado modal */}
      {editEstado !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Cambiar estado del equipo</h2>
            <select value={editEstado} onChange={(e) => setEditEstado(e.target.value)} className={inputClass}>
              <option value="ACTIVO">Activo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
            </select>
            <div className="flex gap-3 mt-4">
              <button onClick={updateEstado} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700">Guardar</button>
              <button onClick={() => setEditEstado(null)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit maintenance modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{editingId ? "Editar mantenimiento" : "Registrar mantenimiento"}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="INSPECCION">Inspección</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={(e) => handleFechaChange(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className={inputClass + " resize-none"} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Técnico responsable</label>
                  <select value={form.tecnicoId} onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })} className={inputClass}>
                    <option value="">{editingId && form.tecnicoActual ? "Sin cambiar" : "Sin asignar"}</option>
                    {biomedicos.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} {b.apellidos ?? ""}
                      </option>
                    ))}
                  </select>
                  {editingId && form.tecnicoActual && !form.tecnicoId && (
                    <p className="text-xs text-slate-500 mt-1">Actual: <span className="font-medium">{form.tecnicoActual}</span></p>
                  )}
                  {biomedicos.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No hay biomédicos activos en el sistema.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Costo</label>
                  <input type="number" min="0" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className={inputClass} placeholder="0.00" />
                </div>
              </div>

              {/* Próximo mantenimiento — recurrence selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label>
                <select
                  value={form.recurrencia}
                  onChange={(e) => handleRecurrenciaChange(e.target.value)}
                  className={inputClass}
                >
                  {RECURRENCIA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Auto-calculated date display */}
                {form.recurrencia && form.recurrencia !== "PERSONALIZADO" && form.proximoMantenimiento && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    <Calendar size={12} className="text-cyan-600" />
                    <span>Fecha calculada:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(form.proximoMantenimiento + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  </div>
                )}

                {/* Custom date picker */}
                {form.recurrencia === "PERSONALIZADO" && (
                  <input
                    type="date"
                    value={form.proximoMantenimiento}
                    onChange={(e) => setForm({ ...form, proximoMantenimiento: e.target.value })}
                    className={inputClass + " mt-2"}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado del equipo</label>
                <select value={form.nuevoEstado} onChange={(e) => setForm({ ...form, nuevoEstado: e.target.value })} className={inputClass}>
                  <option value="">No cambiar</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Registrar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">¿Eliminar mantenimiento?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Se eliminará el registro de{" "}
                  <strong>{deleteTarget.tipo === "PREVENTIVO" ? "mantenimiento preventivo" : deleteTarget.tipo === "CORRECTIVO" ? "mantenimiento correctivo" : "inspección"}</strong>{" "}
                  del {new Date(deleteTarget.fecha).toLocaleDateString("es-MX")}. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
