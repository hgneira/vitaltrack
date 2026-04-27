"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, CheckSquare, FileText, BookOpen, Wrench, Plus, X, Trash2,
  CheckCircle, AlertTriangle, Activity, Clock, Save, ExternalLink,
} from "lucide-react";

type Tab = "accesorios" | "manuales" | "guia" | "mantenimiento";

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

interface Equipo { id: string; nombre: string; marca?: string; modelo?: string; numeroSerie?: string; ubicacion?: string; estado: string; }
interface Accesorio { id: string; nombre: string; requerido: boolean; orden: number; }
interface VerifItem { accesorioId: string; accesorio: { nombre: string }; presente: boolean; }
interface Verificacion { id: string; fecha: string; notas?: string; verificadoPor: { nombre: string; apellidos?: string }; items: VerifItem[]; }
interface Documento { id: string; tipo: string; nombre: string; url: string; subidoPor: { nombre: string }; createdAt: string; }
interface Mantenimiento { id: string; tipo: string; fecha: string; tecnico?: string; descripcion?: string; costo?: number; }

const TIPO_DOC_LABEL: Record<string, string> = { MANUAL_USUARIO: "Manual de usuario", MANUAL_SERVICIO: "Manual de servicio", OTRO: "Otro" };

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol ?? "";
  const canEdit = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(rol);

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [tab, setTab] = useState<Tab>("accesorios");

  // Accesorios
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([]);
  const [notasVerif, setNotasVerif] = useState("");
  const [savingVerif, setSavingVerif] = useState(false);
  const [newAccNombre, setNewAccNombre] = useState("");
  const [newAccReq, setNewAccReq] = useState(true);
  const [addingAcc, setAddingAcc] = useState(false);

  // Documentos
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [pdfView, setPdfView] = useState<Documento | null>(null);
  const [newDoc, setNewDoc] = useState({ tipo: "MANUAL_USUARIO", nombre: "", url: "" });
  const [addingDoc, setAddingDoc] = useState(false);

  // Guía
  const [pasos, setPasos] = useState<string[]>([]);
  const [editingGuia, setEditingGuia] = useState(false);
  const [draftPasos, setDraftPasos] = useState<string[]>([]);
  const [savingGuia, setSavingGuia] = useState(false);

  // Mantenimiento
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);

  useEffect(() => {
    fetch(`/api/equipos/${id}`).then(r => r.json()).then(d => setEquipo(d.equipo ?? d));
    loadAccesorios();
    loadVerificaciones();
    loadDocumentos();
    loadGuia();
    loadMantenimientos();
  }, [id]);

  const loadAccesorios = () =>
    fetch(`/api/equipos/${id}/accesorios`).then(r => r.json()).then((data: Accesorio[]) => {
      setAccesorios(data);
      const init: Record<string, boolean> = {};
      data.forEach(a => { init[a.id] = true; });
      setCheckState(init);
    });

  const loadVerificaciones = () =>
    fetch(`/api/equipos/${id}/verificaciones`).then(r => r.json()).then(setVerificaciones);

  const loadDocumentos = () =>
    fetch(`/api/equipos/${id}/documentos`).then(r => r.json()).then(setDocumentos);

  const loadGuia = () =>
    fetch(`/api/equipos/${id}/guia`).then(r => r.json()).then(d => {
      const p = Array.isArray(d.pasos) ? d.pasos : [];
      setPasos(p);
      setDraftPasos(p);
    });

  const loadMantenimientos = () =>
    fetch(`/api/equipos/${id}/mantenimientos`).then(r => r.json()).then(setMantenimientos);

  const saveVerificacion = async () => {
    setSavingVerif(true);
    const items = accesorios.map(a => ({ accesorioId: a.id, presente: checkState[a.id] ?? false }));
    const res = await fetch(`/api/equipos/${id}/verificaciones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, notas: notasVerif }),
    });
    if (res.ok) { await loadVerificaciones(); setNotasVerif(""); }
    setSavingVerif(false);
  };

  const addAccesorio = async () => {
    if (!newAccNombre.trim()) return;
    await fetch(`/api/equipos/${id}/accesorios`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newAccNombre, requerido: newAccReq }),
    });
    setNewAccNombre(""); setAddingAcc(false);
    await loadAccesorios();
  };

  const deleteAccesorio = async (accId: string) => {
    await fetch(`/api/equipos/${id}/accesorios/${accId}`, { method: "DELETE" });
    await loadAccesorios();
  };

  const addDocumento = async () => {
    if (!newDoc.nombre.trim() || !newDoc.url.trim()) return;
    await fetch(`/api/equipos/${id}/documentos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDoc),
    });
    setNewDoc({ tipo: "MANUAL_USUARIO", nombre: "", url: "" }); setAddingDoc(false);
    await loadDocumentos();
  };

  const deleteDocumento = async (docId: string) => {
    await fetch(`/api/equipos/${id}/documentos/${docId}`, { method: "DELETE" });
    await loadDocumentos();
  };

  const saveGuia = async () => {
    setSavingGuia(true);
    await fetch(`/api/equipos/${id}/guia`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pasos: draftPasos.filter(p => p.trim()) }),
    });
    await loadGuia(); setEditingGuia(false); setSavingGuia(false);
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "accesorios", label: "Accesorios", icon: CheckSquare },
    { key: "manuales",   label: "Manuales PDF", icon: FileText },
    { key: "guia",       label: "Guía rápida", icon: BookOpen },
    { key: "mantenimiento", label: "Mantenimiento", icon: Wrench },
  ];

  const ESTADO_CFG: Record<string, { label: string; color: string }> = {
    ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700" },
    EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700" },
    FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600" },
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">{equipo?.nombre ?? "Cargando…"}</h1>
            {equipo && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CFG[equipo.estado]?.color ?? "bg-slate-100 text-slate-600"}`}>
                {ESTADO_CFG[equipo.estado]?.label ?? equipo.estado}
              </span>
            )}
          </div>
          {equipo && <p className="text-xs text-slate-400 mt-0.5">{[equipo.marca, equipo.modelo, equipo.numeroSerie ? `S/N ${equipo.numeroSerie}` : null].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-1 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-8">

        {/* ── ACCESORIOS ── */}
        {tab === "accesorios" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Lista de accesorios</h2>
                {canEdit && (
                  <button onClick={() => setAddingAcc(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-800">
                    <Plus size={14} /> Agregar
                  </button>
                )}
              </div>
              {addingAcc && canEdit && (
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <input value={newAccNombre} onChange={e => setNewAccNombre(e.target.value)} placeholder="Nombre del accesorio"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={newAccReq} onChange={e => setNewAccReq(e.target.checked)} className="rounded" />
                    Requerido
                  </label>
                  <button onClick={addAccesorio} className="px-3 py-1.5 bg-cyan-600 text-white text-xs font-medium rounded-lg hover:bg-cyan-700">Guardar</button>
                  <button onClick={() => setAddingAcc(false)}><X size={14} className="text-slate-400" /></button>
                </div>
              )}
              {accesorios.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">Sin accesorios registrados</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {accesorios.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 px-6 py-3 group">
                      <input type="checkbox" checked={checkState[acc.id] ?? true}
                        onChange={e => setCheckState(s => ({ ...s, [acc.id]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-cyan-600 cursor-pointer" />
                      <span className="flex-1 text-sm text-slate-700">{acc.nombre}</span>
                      {acc.requerido && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Requerido</span>}
                      {canEdit && (
                        <button onClick={() => deleteAccesorio(acc.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {accesorios.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <input value={notasVerif} onChange={e => setNotasVerif(e.target.value)} placeholder="Notas de verificación (opcional)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  <button onClick={saveVerificacion} disabled={savingVerif}
                    className="w-full bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                    {savingVerif ? "Guardando…" : "Registrar verificación"}
                  </button>
                </div>
              )}
            </div>

            {/* Historial de verificaciones */}
            {verificaciones.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Historial de verificaciones</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {verificaciones.map(v => {
                    const presentes = v.items.filter(i => i.presente).length;
                    const total = v.items.length;
                    return (
                      <div key={v.id} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{v.verificadoPor.nombre} {v.verificadoPor.apellidos}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} />
                              {new Date(v.fecha).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${presentes === total ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                            {presentes}/{total} presentes
                          </span>
                        </div>
                        {v.notas && <p className="text-xs text-slate-500 italic">{v.notas}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {v.items.map(item => (
                            <span key={item.accesorioId}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${item.presente ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                              {item.presente ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                              {item.accesorio.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MANUALES ── */}
        {tab === "manuales" && (
          <div className="max-w-3xl space-y-4">
            {canEdit && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <button onClick={() => setAddingDoc(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2 text-sm font-medium text-cyan-600"><Plus size={15} /> Agregar documento</span>
                </button>
                {addingDoc && (
                  <div className="px-6 pb-5 border-t border-slate-100 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                        <select value={newDoc.tipo} onChange={e => setNewDoc(d => ({ ...d, tipo: e.target.value }))} className={inputCls}>
                          <option value="MANUAL_USUARIO">Manual de usuario</option>
                          <option value="MANUAL_SERVICIO">Manual de servicio</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del documento</label>
                        <input value={newDoc.nombre} onChange={e => setNewDoc(d => ({ ...d, nombre: e.target.value }))} className={inputCls} placeholder="Manual Philips MX450 v2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">URL del PDF</label>
                      <input value={newDoc.url} onChange={e => setNewDoc(d => ({ ...d, url: e.target.value }))} className={inputCls} placeholder="https://..." />
                      <p className="text-xs text-slate-400 mt-1">Pega el enlace directo al PDF (Google Drive, Dropbox, etc.)</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addDocumento} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-cyan-700">Guardar</button>
                      <button onClick={() => setAddingDoc(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {documentos.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-12 text-center text-slate-400 text-sm">
                Sin documentos registrados
              </div>
            ) : (
              documentos.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{doc.nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{TIPO_DOC_LABEL[doc.tipo] ?? doc.tipo} · Subido por {doc.subidoPor.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Abrir en nueva pestaña">
                        <ExternalLink size={14} />
                      </a>
                      <button onClick={() => setPdfView(pdfView?.id === doc.id ? null : doc)} className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg">
                        {pdfView?.id === doc.id ? "Cerrar" : "Ver PDF"}
                      </button>
                      {canEdit && (
                        <button onClick={() => deleteDocumento(doc.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {pdfView?.id === doc.id && (
                    <div className="h-[600px] bg-slate-100">
                      <iframe src={doc.url} className="w-full h-full" title={doc.nombre} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── GUÍA RÁPIDA ── */}
        {tab === "guia" && (
          <div className="max-w-xl">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Guía rápida de uso</h2>
                {canEdit && !editingGuia && (
                  <button onClick={() => { setDraftPasos(pasos.length ? [...pasos] : [""]); setEditingGuia(true); }}
                    className="text-xs font-medium text-cyan-600 hover:text-cyan-800">
                    Editar
                  </button>
                )}
              </div>

              {editingGuia && canEdit ? (
                <div className="p-6 space-y-3">
                  {draftPasos.map((paso, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center shrink-0 mt-1.5 font-bold">{i + 1}</span>
                      <textarea value={paso} rows={2} onChange={e => setDraftPasos(ps => ps.map((p, j) => j === i ? e.target.value : p))}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
                      <button onClick={() => setDraftPasos(ps => ps.filter((_, j) => j !== i))} className="mt-2 text-slate-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setDraftPasos(ps => [...ps, ""])}
                    className="flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-800 font-medium">
                    <Plus size={13} /> Agregar paso
                  </button>
                  <div className="flex gap-2 pt-2">
                    <button onClick={saveGuia} disabled={savingGuia}
                      className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                      <Save size={14} /> {savingGuia ? "Guardando…" : "Guardar guía"}
                    </button>
                    <button onClick={() => setEditingGuia(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm">Cancelar</button>
                  </div>
                </div>
              ) : pasos.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">Sin guía rápida registrada</div>
              ) : (
                <div className="p-6 space-y-4">
                  {pasos.map((paso, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="w-7 h-7 rounded-full bg-cyan-600 text-white text-sm flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                      <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{paso}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MANTENIMIENTO ── */}
        {tab === "mantenimiento" && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Historial de mantenimiento</h2>
              </div>
              {mantenimientos.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">Sin registros</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mantenimientos.map(m => (
                    <div key={m.id} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Wrench size={14} className="text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase()}</span>
                          <span className="text-xs text-slate-400">{new Date(m.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        {m.tecnico && <p className="text-xs text-slate-500 mt-0.5">Técnico: {m.tecnico}</p>}
                        {m.descripcion && <p className="text-xs text-slate-500 mt-0.5">{m.descripcion}</p>}
                      </div>
                      {m.costo != null && <span className="text-xs font-medium text-slate-600">${m.costo.toLocaleString("es-MX")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
