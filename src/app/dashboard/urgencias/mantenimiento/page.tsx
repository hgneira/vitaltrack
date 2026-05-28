"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wrench, AlertTriangle, MapPin, RefreshCw, Plus, X,
  Printer, CheckSquare, Square, ChevronDown,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
interface FormatoData {
  version: 2;
  observaciones: string;
  hallazgos: string;
  piezasReemplazadas: string;
  estadoFinal: string;
  checklist: Record<string, boolean>;
}

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
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  estado: string;
  mantenimientos: Mant[];
}

// ─── constants ────────────────────────────────────────────────────────────────
const TIPO_CFG: Record<string, { label: string; color: string }> = {
  PREVENTIVO:  { label: "Preventivo",  color: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200" },
  CORRECTIVO:  { label: "Correctivo",  color: "bg-red-100 text-red-700 ring-1 ring-red-200" },
  CALIBRACION: { label: "Calibración", color: "bg-violet-100 text-violet-700 ring-1 ring-violet-200" },
  LIMPIEZA:    { label: "Limpieza",    color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  VERIFICACION:{ label: "Verificación",color: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" },
  INSPECCION:  { label: "Inspección",  color: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" },
};

const CHECKLIST: Record<string, { id: string; label: string }[]> = {
  PREVENTIVO: [
    { id: "limpiezaExterior",    label: "Limpieza exterior del equipo" },
    { id: "limpiezaInterior",    label: "Limpieza interior / filtros" },
    { id: "revisionCables",      label: "Revisión de cables y conexiones" },
    { id: "inspeccionVisual",    label: "Inspección visual general" },
    { id: "lubricacion",         label: "Lubricación de piezas móviles" },
    { id: "pruebaFuncionamiento",label: "Prueba de funcionamiento" },
    { id: "calibracion",         label: "Verificación de calibración" },
    { id: "revisionAlarmas",     label: "Revisión de alarmas y alertas" },
    { id: "pruebaSeguridad",     label: "Prueba de seguridad eléctrica" },
    { id: "documentacion",       label: "Documentación / etiquetado actualizado" },
  ],
  CORRECTIVO: [
    { id: "diagnostico",         label: "Diagnóstico de falla" },
    { id: "reparacion",          label: "Reparación realizada" },
    { id: "pruebaFuncionamiento",label: "Prueba de funcionamiento post-reparación" },
    { id: "calibracion",         label: "Calibración post-reparación" },
    { id: "pruebaSeguridad",     label: "Prueba de seguridad eléctrica" },
    { id: "limpiezaGeneral",     label: "Limpieza general" },
    { id: "documentacion",       label: "Documentación actualizada" },
  ],
  CALIBRACION: [
    { id: "inspeccionVisual",    label: "Inspección visual previa" },
    { id: "calibracionRealizada",label: "Calibración realizada conforme a especificaciones" },
    { id: "registroValores",     label: "Registro de valores antes/después" },
    { id: "pruebaFuncionamiento",label: "Prueba de funcionamiento" },
    { id: "documentacion",       label: "Certificado / documentación actualizada" },
  ],
  DEFAULT: [
    { id: "inspeccionVisual",    label: "Inspección visual" },
    { id: "limpiezaGeneral",     label: "Limpieza general" },
    { id: "pruebaFuncionamiento",label: "Prueba de funcionamiento" },
    { id: "documentacion",       label: "Documentación actualizada" },
  ],
};

function getChecklist(tipo: string) {
  return CHECKLIST[tipo] ?? CHECKLIST.DEFAULT;
}

function emptyFormato(tipo: string): FormatoData {
  const items = getChecklist(tipo);
  const checklist: Record<string, boolean> = {};
  items.forEach(i => { checklist[i.id] = false; });
  return { version: 2, observaciones: "", hallazgos: "", piezasReemplazadas: "", estadoFinal: "OPERATIVO", checklist };
}

function parseFormato(descripcion?: string): FormatoData | null {
  if (!descripcion) return null;
  try {
    const d = JSON.parse(descripcion);
    if (d.version === 2) return d as FormatoData;
    return null;
  } catch { return null; }
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
const emptyForm = {
  equipoId: "", tipo: "PREVENTIVO",
  fecha: new Date().toISOString().slice(0, 10),
  tecnico: "", costo: "", proximoMantenimiento: "", nuevoEstado: "",
};

// ─── PrintModal ───────────────────────────────────────────────────────────────
function PrintModal({ mant, equipo, onClose }: { mant: Mant; equipo: Equipo; onClose: () => void }) {
  const fmt = parseFormato(mant.descripcion);
  const tipo = TIPO_CFG[mant.tipo] ?? { label: mant.tipo, color: "" };
  const items = getChecklist(mant.tipo);

  const doPrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden-overlay">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-formato { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; padding: 32px; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* modal header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Printer size={16} className="text-amber-500" /> Formato de Mantenimiento
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={doPrint}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
          </div>
        </div>

        {/* scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div id="print-formato" className="space-y-6">
            {/* document header */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm uppercase tracking-wide">Hospital — Urgencias</p>
                  <p className="text-xs text-slate-300 mt-0.5">Formato de Registro de Mantenimiento</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-300">Folio</p>
                  <p className="font-mono text-sm font-bold">{mant.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>

              {/* equipment info */}
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-200 text-sm">
                <div className="col-span-2 mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Datos del Equipo</p>
                </div>
                <Row label="Equipo" value={equipo.nombre} />
                <Row label="Ubicación" value={equipo.ubicacion ?? "—"} />
                <Row label="Marca" value={equipo.marca ?? "—"} />
                <Row label="Modelo" value={equipo.modelo ?? "—"} />
                <Row label="N° Serie" value={equipo.numeroSerie ?? "—"} />
                <Row label="Tipo de mantenimiento" value={tipo.label} />
                <Row label="Fecha" value={new Date(mant.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} />
                <Row label="Técnico responsable" value={mant.tecnico ?? "—"} />
                {mant.costo != null && <Row label="Costo (MXN)" value={`$${mant.costo.toLocaleString("es-MX")}`} />}
                {mant.proximoMantenimiento && (
                  <Row label="Próximo mantenimiento" value={new Date(mant.proximoMantenimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} />
                )}
              </div>

              {/* checklist */}
              <div className="p-4 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lista de Verificación</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {items.map(item => {
                    const checked = fmt?.checklist?.[item.id] ?? false;
                    return (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        {checked
                          ? <CheckSquare size={15} className="text-emerald-600 shrink-0" />
                          : <Square size={15} className="text-slate-300 shrink-0" />}
                        <span className={checked ? "text-slate-800" : "text-slate-400"}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* observations */}
              {fmt ? (
                <>
                  {fmt.observaciones && (
                    <div className="p-4 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trabajo Realizado / Observaciones</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.observaciones}</p>
                    </div>
                  )}
                  {fmt.hallazgos && (
                    <div className="p-4 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hallazgos</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.hallazgos}</p>
                    </div>
                  )}
                  {fmt.piezasReemplazadas && (
                    <div className="p-4 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Piezas / Partes Reemplazadas</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.piezasReemplazadas}</p>
                    </div>
                  )}
                  <div className="p-4 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estado Final del Equipo</p>
                    <p className="text-sm font-semibold text-slate-800">{
                      fmt.estadoFinal === "OPERATIVO" ? "✓ Operativo" :
                      fmt.estadoFinal === "REQUIERE_SEGUIMIENTO" ? "⚠ Requiere seguimiento" :
                      fmt.estadoFinal === "FUERA_DE_SERVICIO" ? "✗ Fuera de servicio" :
                      fmt.estadoFinal
                    }</p>
                  </div>
                </>
              ) : mant.descripcion ? (
                <div className="p-4 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{mant.descripcion}</p>
                </div>
              ) : null}

              {/* signatures */}
              <div className="p-4 grid grid-cols-2 gap-8">
                <div>
                  <div className="border-b border-slate-400 mb-1 pb-6" />
                  <p className="text-xs text-center text-slate-500">Técnico responsable</p>
                  {mant.tecnico && <p className="text-xs text-center font-medium text-slate-700">{mant.tecnico}</p>}
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1 pb-6" />
                  <p className="text-xs text-center text-slate-500">Jefe de área / Vo. Bo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}: </span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function MantenimientoPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formato, setFormato] = useState<FormatoData>(emptyFormato("PREVENTIVO"));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [printTarget, setPrintTarget] = useState<{ mant: Mant; equipo: Equipo } | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/equipos").then(r => r.json());
    setEquipos(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const allMants = useMemo(() => {
    const list: { equipo: Equipo; mant: Mant }[] = [];
    equipos.forEach(e => e.mantenimientos.forEach(m => list.push({ equipo: e, mant: m })));
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
    setForm({ ...emptyForm, equipoId, fecha: new Date().toISOString().slice(0, 10) });
    setFormato(emptyFormato("PREVENTIVO"));
    setFormError("");
    setShowForm(true);
  };

  // when tipo changes, reset checklist
  const changeTipo = (tipo: string) => {
    setForm(f => ({ ...f, tipo }));
    setFormato(emptyFormato(tipo));
  };

  const toggleCheck = (id: string) => {
    setFormato(f => ({ ...f, checklist: { ...f.checklist, [id]: !f.checklist[id] } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipoId) { setFormError("Selecciona un dispositivo"); return; }
    setSaving(true); setFormError("");

    const body = {
      tipo: form.tipo,
      fecha: form.fecha,
      descripcion: JSON.stringify(formato),
      tecnico: form.tecnico || null,
      costo: form.costo ? Number(form.costo) : null,
      proximoMantenimiento: form.proximoMantenimiento || null,
      nuevoEstado: form.nuevoEstado || null,
    };
    const res = await fetch(`/api/equipos/${form.equipoId}/mantenimientos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { await load(); setShowForm(false); }
    else { const d = await res.json(); setFormError(d.error ?? "Error al guardar"); }
    setSaving(false);
  };

  const checklistItems = getChecklist(form.tipo);

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Wrench size={16} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Mantenimiento</h1>
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
            {alertas.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" /> Alertas de vencimiento ({alertas.length})
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
                            {TIPO_CFG[mant.tipo]?.label ?? mant.tipo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${overdue ? "text-red-600" : "text-amber-700"}`}>{overdue ? "VENCIDO" : "Por vencer"}</p>
                          <p className="text-xs text-slate-500">{new Date(mant.proximoMantenimiento!).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <button onClick={() => openForm(equipo.id)} className="text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                          + Registrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMants.map(({ equipo, mant }) => {
                      const tipo = TIPO_CFG[mant.tipo] ?? { label: mant.tipo, color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
                      const hasFmt = !!parseFormato(mant.descripcion);
                      return (
                        <tr key={mant.id} className="hover:bg-slate-50 transition-colors group">
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
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setPrintTarget({ mant, equipo })}
                              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors
                                ${hasFmt
                                  ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                  : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"}`}
                            >
                              <Printer size={12} /> {hasFmt ? "Ver formato" : "Ver / Imprimir"}
                            </button>
                          </td>
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

      {/* ── Print Modal ── */}
      {printTarget && (
        <PrintModal mant={printTarget.mant} equipo={printTarget.equipo} onClose={() => setPrintTarget(null)} />
      )}

      {/* ── Registro Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white shrink-0">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Wrench size={16} className="text-amber-500" /> Formato de Mantenimiento
              </h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* ── Datos generales ── */}
              <section>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Datos Generales</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dispositivo *</label>
                    <select required value={form.equipoId} onChange={e => setForm(f => ({ ...f, equipoId: e.target.value }))} className={inputCls}>
                      <option value="">Selecciona un dispositivo…</option>
                      {equipos.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nombre}{eq.ubicacion ? ` — ${eq.ubicacion}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                      <div className="relative">
                        <select required value={form.tipo} onChange={e => changeTipo(e.target.value)} className={inputCls}>
                          <option value="PREVENTIVO">Preventivo</option>
                          <option value="CORRECTIVO">Correctivo</option>
                          <option value="CALIBRACION">Calibración</option>
                          <option value=>Limpieza</option>
                          <option value="VERIFICACION">Verificación</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                      <input required type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Técnico responsable</label>
                      <input value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} className={inputCls} placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Costo (MXN)</label>
                      <input type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} className={inputCls} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label>
                      <input type="date" value={form.proximoMantenimiento} onChange={e => setForm(f => ({ ...f, proximoMantenimiento: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado del equipo</label>
                      <select value={form.nuevoEstado} onChange={e => setForm(f => ({ ...f, nuevoEstado: e.target.value }))} className={inputCls}>
                        <option value="">No cambiar</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                        <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Checklist ── */}
              <section>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lista de Verificación</p>
                <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200 grid grid-cols-2 gap-2">
                  {checklistItems.map(item => (
                    <button key={item.id} type="button" onClick={() => toggleCheck(item.id)}
                      className="flex items-center gap-2 text-sm text-left px-2 py-1.5 rounded-lg hover:bg-white transition-colors">
                      {formato.checklist[item.id]
                        ? <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                        : <Square size={16} className="text-slate-300 shrink-0" />}
                      <span className={formato.checklist[item.id] ? "text-slate-800" : "text-slate-400"}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Detalle ── */}
              <section>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detalle del Trabajo</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Trabajo realizado / Observaciones</label>
                    <textarea value={formato.observaciones} onChange={e => setFormato(f => ({ ...f, observaciones: e.target.value }))}
                      rows={3} className={inputCls + " resize-none"} placeholder="Describe el trabajo realizado…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Hallazgos</label>
                    <textarea value={formato.hallazgos} onChange={e => setFormato(f => ({ ...f, hallazgos: e.target.value }))}
                      rows={2} className={inputCls + " resize-none"} placeholder="Hallazgos encontrados durante el mantenimiento…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Piezas / Partes reemplazadas</label>
                    <textarea value={formato.piezasReemplazadas} onChange={e => setFormato(f => ({ ...f, piezasReemplazadas: e.target.value }))}
                      rows={2} className={inputCls + " resize-none"} placeholder="Lista de refacciones utilizadas…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Estado final del equipo</label>
                    <select value={formato.estadoFinal} onChange={e => setFormato(f => ({ ...f, estadoFinal: e.target.value }))} className={inputCls}>
                      <option value="OPERATIVO">Operativo</option>
                      <option value="REQUIERE_SEGUIMIENTO">Requiere seguimiento</option>
                      <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                    </select>
                  </div>
                </div>
              </section>

              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar formato de mantenimiento"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
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
