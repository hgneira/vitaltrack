"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, CheckSquare, Square, FileText, BookOpen, Wrench, Plus, X, Trash2,
  CheckCircle, AlertTriangle, Activity, Clock, Save, ExternalLink,
  ClipboardList, Printer, Upload, Link as LinkIcon, Pencil, ChevronRight,
} from "lucide-react";
import { upload } from "@vercel/blob/client";

type Tab = "accesorios" | "manuales" | "guia" | "mantenimiento" | "formatos" | "historial";
type Formato = "baja" | "servicio" | "recepcion";
interface FormatoSaved { id: string; tipo: string; datos: string; createdAt: string; creadoPor: { nombre: string; apellidos?: string } }

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

interface Equipo { id: string; nombre: string; marca?: string; modelo?: string; numeroSerie?: string; ubicacion?: string; estado: string; tagUid?: string; }

const RIESGO_CFG: Record<string, { label: string; color: string; dot: string }> = {
  BAJO:     { label: "Riesgo Bajo",     color: "bg-emerald-100 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  MODERADO: { label: "Riesgo Moderado", color: "bg-amber-100 text-amber-700 ring-amber-200",       dot: "bg-amber-500" },
  ALTO:     { label: "Riesgo Alto",     color: "bg-red-100 text-red-700 ring-red-200",              dot: "bg-red-500" },
};
interface Accesorio { id: string; nombre: string; requerido: boolean; orden: number; }
interface VerifItem { accesorioId: string; accesorio: { nombre: string }; presente: boolean; }
interface Verificacion { id: string; fecha: string; notas?: string; verificadoPor: { nombre: string; apellidos?: string }; items: VerifItem[]; }
interface Documento { id: string; tipo: string; nombre: string; url: string; subidoPor: { nombre: string }; createdAt: string; }
interface Mantenimiento { id: string; tipo: string; fecha: string; tecnico?: string; descripcion?: string; costo?: number; proximoMantenimiento?: string; }

// ── Formato de mantenimiento helpers ──────────────────────────────────────────
interface FormatoData { version: 2; observaciones: string; hallazgos: string; piezasReemplazadas: string; estadoFinal: string; checklist: Record<string, boolean>; }
const MANT_CHECKLIST: Record<string, { id: string; label: string }[]> = {
  PREVENTIVO:  [{ id:"limpiezaExterior",label:"Limpieza exterior" },{ id:"limpiezaInterior",label:"Limpieza interior / filtros" },{ id:"revisionCables",label:"Revisión de cables y conexiones" },{ id:"inspeccionVisual",label:"Inspección visual general" },{ id:"lubricacion",label:"Lubricación de piezas móviles" },{ id:"pruebaFuncionamiento",label:"Prueba de funcionamiento" },{ id:"calibracion",label:"Verificación de calibración" },{ id:"revisionAlarmas",label:"Revisión de alarmas" },{ id:"pruebaSeguridad",label:"Prueba de seguridad eléctrica" },{ id:"documentacion",label:"Documentación actualizada" }],
  CORRECTIVO:  [{ id:"diagnostico",label:"Diagnóstico de falla" },{ id:"reparacion",label:"Reparación realizada" },{ id:"pruebaFuncionamiento",label:"Prueba de funcionamiento post-reparación" },{ id:"calibracion",label:"Calibración post-reparación" },{ id:"pruebaSeguridad",label:"Prueba de seguridad eléctrica" },{ id:"limpiezaGeneral",label:"Limpieza general" },{ id:"documentacion",label:"Documentación actualizada" }],
  CALIBRACION: [{ id:"inspeccionVisual",label:"Inspección visual previa" },{ id:"calibracionRealizada",label:"Calibración conforme a especificaciones" },{ id:"registroValores",label:"Registro de valores antes/después" },{ id:"pruebaFuncionamiento",label:"Prueba de funcionamiento" },{ id:"documentacion",label:"Certificado / documentación actualizada" }],
  DEFAULT:     [{ id:"inspeccionVisual",label:"Inspección visual" },{ id:"limpiezaGeneral",label:"Limpieza general" },{ id:"pruebaFuncionamiento",label:"Prueba de funcionamiento" },{ id:"documentacion",label:"Documentación actualizada" }],
};
function getMantChecklist(tipo: string) { return MANT_CHECKLIST[tipo] ?? MANT_CHECKLIST.DEFAULT; }
function emptyMantFormato(tipo: string): FormatoData {
  const ch: Record<string,boolean> = {}; getMantChecklist(tipo).forEach(i => { ch[i.id] = false; });
  return { version: 2, observaciones: "", hallazgos: "", piezasReemplazadas: "", estadoFinal: "OPERATIVO", checklist: ch };
}
function parseMantFormato(descripcion?: string): FormatoData | null {
  if (!descripcion) return null;
  try { const d = JSON.parse(descripcion); return d.version === 2 ? d as FormatoData : null; } catch { return null; }
}

const TIPO_DOC_LABEL: Record<string, string> = { MANUAL_USUARIO: "Manual de usuario", MANUAL_SERVICIO: "Manual de servicio", OTRO: "Otro" };

// Converts Google Drive share URLs to embeddable preview URLs
function toEmbedUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view?... → .../preview
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  // https://docs.google.com/... → append ?embedded=true if needed
  if (url.includes("docs.google.com")) return url.replace(/\/edit.*$/, "/preview");
  return url;
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol ?? "";
  const canEdit = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(rol);
  const canUploadDocs = canEdit || rol === "URGENCIAS";

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
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [uploading, setUploading] = useState(false);

  // Guía
  const [pasos, setPasos] = useState<string[]>([]);
  const [editingGuia, setEditingGuia] = useState(false);
  const [draftPasos, setDraftPasos] = useState<string[]>([]);
  const [savingGuia, setSavingGuia] = useState(false);

  // Mantenimiento
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [showMantForm, setShowMantForm] = useState(false);
  const [editMant, setEditMant] = useState<Mantenimiento | null>(null);
  const [printMant, setPrintMant] = useState<Mantenimiento | null>(null);
  const [savingMant, setSavingMant] = useState(false);
  const [mantForm, setMantForm] = useState({ tipo: "PREVENTIVO", fecha: new Date().toISOString().slice(0,10), tecnico: "", costo: "", proximoMantenimiento: "", nuevoEstado: "" });
  const [mantFormato, setMantFormato] = useState<FormatoData>(emptyMantFormato("PREVENTIVO"));
  const [mantError, setMantError] = useState("");

  // Riesgo
  const [riesgo, setRiesgo] = useState<{ nivel: string; score: number; factores: string[] } | null>(null);
  const [showRiesgoTooltip, setShowRiesgoTooltip] = useState(false);

  // Formatos oficiales
  const [formatoActivo, setFormatoActivo] = useState<Formato | null>(null);
  const [savingFormato, setSavingFormato] = useState(false);
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [formatosSaved, setFormatosSaved] = useState<FormatoSaved[]>([]);
  const [historialView, setHistorialView] = useState<FormatoSaved | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const [fmBaja, setFmBaja] = useState({ noControl: "", fecha: today, noInventario: "", valorOriginal: "", fechaAdquisicion: "", valorLibros: "", depreciacion: "", motivo: "OBSOLESCENCIA", otroMotivo: "", descripcion: "", observaciones: "", docManual: false, docFactura: false, docHistorial: false, docDictamen: false });
  const [fmServicio, setFmServicio] = useState({ folio: "", fecha: today, tipoPreventivo: false, tipoCorrectivo: false, tipoCalib: false, tipoInstalacion: false, tipoVerif: false, descripcion: "", tecnico: "", observaciones: "", recibidoPor: "", calificacion: "" });
  const [fmRecepcion, setFmRecepcion] = useState({ proveedor: "", contacto: "", telefono: "", fechaCompra: "", costo: "", factura: "", fechaInstalacion: "", garantiaHasta: "", manualUsuario: false, manualServicio: false, manualPartes: false, pendientes: "", recibidoPor: "", cargo: "", fechaRecepcion: today });

  const loadFormatos = () =>
    fetch(`/api/equipos/${id}/formatos`).then(r => r.json()).then((d: FormatoSaved[]) => setFormatosSaved(Array.isArray(d) ? d : []));

  useEffect(() => {
    fetch(`/api/equipos/${id}`).then(r => r.json()).then(d => setEquipo(d.equipo ?? d));
    loadAccesorios();
    loadVerificaciones();
    loadDocumentos();
    loadGuia();
    loadMantenimientos();
    loadFormatos();
    fetch(`/api/equipos/riesgo?equipoId=${id}`)
      .then(r => r.json())
      .then((data: any[]) => { if (Array.isArray(data) && data[0]) setRiesgo(data[0]); })
      .catch(() => {});
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

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") return;
    const nombre = newDoc.nombre.trim() || file.name.replace(/\.pdf$/i, "");
    setUploading(true);
    try {
      // Upload goes browser → Vercel Blob directly (no serverless body limit)
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/equipos/upload",
      });

      // Save URL reference in DB
      const saveRes = await fetch(`/api/equipos/${id}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: newDoc.tipo, nombre, url: blob.url }),
      });
      if (!saveRes.ok) throw new Error("Error al guardar el documento");

      setNewDoc({ tipo: "MANUAL_USUARIO", nombre: "", url: "" });
      setAddingDoc(false);
      await loadDocumentos();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocumento = async (docId: string) => {
    await fetch(`/api/equipos/${id}/documentos/${docId}`, { method: "DELETE" });
    await loadDocumentos();
  };

  const handlePrint = () => {
    const s = document.createElement("style");
    s.id = "__fmt_print";
    s.textContent = `@media print { * { visibility: hidden !important; } #fmt-doc, #fmt-doc * { visibility: visible !important; } #fmt-doc { position: fixed; inset: 0; background: white; padding: 15mm 20mm; overflow: visible; z-index: 9999; } .no-print { display: none !important; } }`;
    document.head.appendChild(s);
    window.print();
    setTimeout(() => document.getElementById("__fmt_print")?.remove(), 500);
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
    { key: "formatos",   label: "Formatos Oficiales", icon: ClipboardList },
    { key: "historial",  label: "Historial de formatos", icon: FileText },
  ];

  const ESTADO_CFG: Record<string, { label: string; color: string }> = {
    ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700" },
    EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700" },
    FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600" },
    DADO_DE_BAJA:      { label: "Dado de baja",      color: "bg-slate-200 text-slate-600" },
  };

  const saveFormato = async (tipo: Formato, datos: object) => {
    setSavingFormato(true);
    try {
      await fetch(`/api/equipos/${id}/formatos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, datos }),
      });
      await loadFormatos();
      if (tipo === "BAJA") {
        // Refresh equipo to show new state, then go to historial tab
        const d = await fetch(`/api/equipos/${id}`).then(r => r.json());
        setEquipo(d.equipo ?? d);
      }
      setFormatoActivo(null);
    } finally {
      setSavingFormato(false);
    }
  };

  const saveTag = async () => {
    setSavingTag(true);
    try {
      const d = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...equipo, tagUid: tagInput.trim().toUpperCase() || null }),
      }).then(r => r.json());
      setEquipo(d);
      setEditingTag(false);
    } finally {
      setSavingTag(false);
    }
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
          {equipo && (
            <div className="flex items-center gap-2 mt-1">
              {editingTag ? (
                <>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="UID RFID (ej: 7E:B8:16:06)"
                    className="text-xs border border-slate-300 rounded px-2 py-0.5 font-mono w-44 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    onKeyDown={e => { if (e.key === "Enter") saveTag(); if (e.key === "Escape") setEditingTag(false); }}
                    autoFocus
                  />
                  <button onClick={saveTag} disabled={savingTag} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50">
                    {savingTag ? "Guardando…" : "Guardar"}
                  </button>
                  <button onClick={() => setEditingTag(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                </>
              ) : (
                <button
                  onClick={() => { setTagInput(equipo.tagUid ?? ""); setEditingTag(true); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-600 transition-colors"
                >
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {equipo.tagUid ? `RFID: ${equipo.tagUid}` : "Asignar tag RFID"}
                  </span>
                  <Pencil size={10} />
                </button>
              )}
            </div>
          )}
        </div>
        {riesgo && (() => {
          const cfg = RIESGO_CFG[riesgo.nivel];
          return (
            <div className="relative">
              <button
                onMouseEnter={() => setShowRiesgoTooltip(true)}
                onMouseLeave={() => setShowRiesgoTooltip(false)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ring-1 ${cfg.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className="opacity-60">({riesgo.score})</span>
              </button>
              {showRiesgoTooltip && riesgo.factores.length > 0 && (
                <div className="absolute right-0 top-8 z-20 bg-slate-900 text-white text-xs rounded-xl px-4 py-3 shadow-lg w-56">
                  <p className="font-semibold mb-1.5 text-slate-300">Factores de riesgo</p>
                  <ul className="space-y-1">
                    {riesgo.factores.map((f, i) => <li key={i} className="flex items-start gap-1.5"><span className="mt-0.5 shrink-0">•</span>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
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
            {canUploadDocs && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <button onClick={() => setAddingDoc(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2 text-sm font-medium text-cyan-600"><Plus size={15} /> Agregar documento</span>
                </button>
                {addingDoc && (
                  <div className="px-6 pb-5 border-t border-slate-100 pt-4 space-y-3">
                    {/* Tipo + Nombre */}
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

                    {/* Modo: archivo o URL */}
                    <div className="flex gap-2">
                      <button onClick={() => setUploadMode("file")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${uploadMode === "file" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        <Upload size={12} /> Subir archivo PDF
                      </button>
                      <button onClick={() => setUploadMode("url")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${uploadMode === "url" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        <LinkIcon size={12} /> Pegar URL
                      </button>
                    </div>

                    {/* Subir archivo */}
                    {uploadMode === "file" && (
                      <div>
                        <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? "border-cyan-300 bg-cyan-50" : "border-slate-200 hover:border-cyan-400 hover:bg-cyan-50"}`}>
                          {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                              <p className="text-xs text-cyan-600 font-medium">Subiendo archivo…</p>
                            </div>
                          ) : (
                            <>
                              <Upload size={20} className="text-slate-400 mb-1" />
                              <p className="text-sm text-slate-500">Haz clic o arrastra un PDF aquí</p>
                              <p className="text-xs text-slate-400 mt-0.5">Máximo 50 MB</p>
                            </>
                          )}
                          <input type="file" accept="application/pdf" className="hidden" disabled={uploading}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                        </label>
                      </div>
                    )}

                    {/* Pegar URL */}
                    {uploadMode === "url" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">URL del PDF</label>
                        <input value={newDoc.url} onChange={e => setNewDoc(d => ({ ...d, url: e.target.value }))} className={inputCls} placeholder="https://..." />
                        <p className="text-xs text-slate-400 mt-1">Enlace directo al PDF (Google Drive, Dropbox, etc.)</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {uploadMode === "url" && (
                        <button onClick={addDocumento} disabled={!newDoc.nombre.trim() || !newDoc.url.trim()}
                          className="flex-1 bg-cyan-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-40">
                          Guardar
                        </button>
                      )}
                      <button onClick={() => { setAddingDoc(false); setNewDoc({ tipo: "MANUAL_USUARIO", nombre: "", url: "" }); }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
                        Cancelar
                      </button>
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
                      {canUploadDocs && (
                        <button onClick={() => deleteDocumento(doc.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {pdfView?.id === doc.id && (
                    <div className="h-[600px] bg-slate-100">
                      <iframe src={toEmbedUrl(doc.url)} className="w-full h-full" title={doc.nombre} />
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
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Historial de mantenimiento</h2>
                <button
                  onClick={() => {
                    setEditMant(null);
                    setMantForm({ tipo: "PREVENTIVO", fecha: new Date().toISOString().slice(0,10), tecnico: "", costo: "", proximoMantenimiento: "", nuevoEstado: "" });
                    setMantFormato(emptyMantFormato("PREVENTIVO"));
                    setMantError(""); setShowMantForm(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={13} /> Registrar
                </button>
              </div>
              {mantenimientos.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">Sin registros</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mantenimientos.map(m => {
                    const fmt = parseMantFormato(m.descripcion);
                    return (
                      <div key={m.id} className="px-6 py-4 flex items-start gap-4 group">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Wrench size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">{m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase()}</span>
                            <span className="text-xs text-slate-400">{new Date(m.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          {m.tecnico && <p className="text-xs text-slate-500 mt-0.5">Técnico: {m.tecnico}</p>}
                          {fmt ? (
                            <p className="text-xs text-emerald-600 mt-0.5">Formato completo registrado</p>
                          ) : m.descripcion ? (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{m.descripcion}</p>
                          ) : null}
                          {m.proximoMantenimiento && <p className="text-xs text-amber-600 mt-0.5">Próximo: {new Date(m.proximoMantenimiento).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {m.costo != null && <span className="text-xs font-medium text-slate-500 mr-1">${m.costo.toLocaleString("es-MX")}</span>}
                          <button title="Imprimir formato" onClick={() => setPrintMant(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <Printer size={13} />
                          </button>
                          <button title="Editar" onClick={() => {
                            setEditMant(m);
                            setMantForm({ tipo: m.tipo, fecha: new Date(m.fecha).toISOString().slice(0,10), tecnico: m.tecnico ?? "", costo: m.costo?.toString() ?? "", proximoMantenimiento: m.proximoMantenimiento ? new Date(m.proximoMantenimiento).toISOString().slice(0,10) : "", nuevoEstado: "" });
                            setMantFormato(fmt ?? emptyMantFormato(m.tipo));
                            setMantError(""); setShowMantForm(true);
                          }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FORMATOS OFICIALES ── */}
        {tab === "formatos" && (
          <div className="max-w-4xl">
            <p className="text-xs text-slate-400 mb-5">Selecciona un formato para pre-llenarlo e imprimirlo.</p>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "baja",     title: "Acta de Baja",                    desc: "Baja definitiva del equipo del inventario institucional." },
                { key: "servicio", title: "Orden de Servicio",               desc: "Autorización y registro de servicio técnico o reparación." },
                { key: "recepcion",title: "Recepción de Equipo",             desc: "Acta de recepción de equipo nuevo o en préstamo." },
              ] as { key: Formato; title: string; desc: string }[]).map(f => (
                <button key={f.key} onClick={() => setFormatoActivo(f.key)}
                  className="text-left bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 hover:ring-cyan-400 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mb-3 group-hover:bg-cyan-100">
                    <ClipboardList size={20} className="text-cyan-600" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </button>
              ))}
            </div>

            {/* ── MODAL FORMATO ── */}
            {formatoActivo && equipo && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-auto py-6 no-print"
                onClick={e => { if (e.target === e.currentTarget) setFormatoActivo(null); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-w-full mx-4">
                  {/* Modal toolbar */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
                    <p className="font-semibold text-slate-800 text-sm">
                      {formatoActivo === "baja"      && "Acta de Baja para Equipo Médico"}
                      {formatoActivo === "servicio"  && "Orden de Servicio"}
                      {formatoActivo === "recepcion" && "Recepción de Equipo Médico"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={savingFormato}
                        onClick={() => {
                          const datos = formatoActivo === "baja" ? fmBaja : formatoActivo === "servicio" ? fmServicio : fmRecepcion;
                          saveFormato(formatoActivo!, datos);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                        <Save size={14} /> {savingFormato ? "Guardando…" : "Guardar en historial"}
                      </button>
                      <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700">
                        <Printer size={14} /> Imprimir
                      </button>
                      <button onClick={() => setFormatoActivo(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Document area */}
                  <div id="fmt-doc" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: "1.4" }}>

                    {/* ── ACTA DE BAJA ── */}
                    {formatoActivo === "baja" && (
                      <div style={{ padding: "24px 32px" }}>
                        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "14px" }}>
                          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: 0 }}>HOSPITAL GENERAL DE ZONA</p>
                          <p style={{ fontWeight: "bold", fontSize: "11pt", margin: "4px 0 0" }}>ACTA DE BAJA PARA EQUIPO MÉDICO</p>
                          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "8px", fontSize: "9pt" }}>
                            <span>No. Control:&nbsp;<input value={fmBaja.noControl} onChange={e => setFmBaja(s=>({...s,noControl:e.target.value}))} style={iStyle} placeholder="____" /></span>
                            <span>Fecha:&nbsp;<input type="date" value={fmBaja.fecha} onChange={e => setFmBaja(s=>({...s,fecha:e.target.value}))} style={iStyle} /></span>
                          </div>
                        </div>

                        <Section title="I. DATOS DEL EQUIPO" />
                        <Grid2>
                          <Field label="Nombre del equipo" value={equipo.nombre} readOnly />
                          <Field label="Servicio / Área" value={equipo.ubicacion ?? ""} readOnly />
                          <Field label="Marca" value={equipo.marca ?? ""} readOnly />
                          <Field label="Modelo" value={equipo.modelo ?? ""} readOnly />
                          <Field label="No. de Serie" value={equipo.numeroSerie ?? ""} readOnly />
                          <Field label="Estado actual" value={equipo.estado} readOnly />
                        </Grid2>

                        <Section title="II. DOCUMENTACIÓN ADJUNTA" />
                        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", margin: "6px 0 12px" }}>
                          {([ ["docManual","Manual de usuario"], ["docFactura","Factura / Comprobante"], ["docHistorial","Historial de mantenimiento"], ["docDictamen","Dictamen técnico"] ] as [keyof typeof fmBaja, string][]).map(([k,l]) => (
                            <label key={k} style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", fontSize:"9.5pt" }}>
                              <input type="checkbox" checked={!!fmBaja[k]} onChange={e => setFmBaja(s=>({...s,[k]:e.target.checked}))} /> {l}
                            </label>
                          ))}
                        </div>

                        <Section title="III. DATOS CONTABLES" />
                        <Grid2>
                          <Field label="No. Inventario" value={fmBaja.noInventario} onChange={v=>setFmBaja(s=>({...s,noInventario:v}))} />
                          <Field label="Valor original ($)" value={fmBaja.valorOriginal} onChange={v=>setFmBaja(s=>({...s,valorOriginal:v}))} />
                          <Field label="Fecha de adquisición" value={fmBaja.fechaAdquisicion} onChange={v=>setFmBaja(s=>({...s,fechaAdquisicion:v}))} type="date" />
                          <Field label="Valor en libros ($)" value={fmBaja.valorLibros} onChange={v=>setFmBaja(s=>({...s,valorLibros:v}))} />
                          <Field label="Depreciación acumulada ($)" value={fmBaja.depreciacion} onChange={v=>setFmBaja(s=>({...s,depreciacion:v}))} />
                        </Grid2>

                        <Section title="IV. MOTIVO DE BAJA" />
                        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", margin: "6px 0 8px" }}>
                          {([["OBSOLESCENCIA","Obsolescencia tecnológica"],["DANO","Daño irreparable"],["VIDA_UTIL","Término de vida útil"],["ROBO","Robo / Extravío"],["OTRO","Otro"]] as [string,string][]).map(([v,l]) => (
                            <label key={v} style={{ display:"flex", alignItems:"center", gap:"5px", cursor:"pointer", fontSize:"9.5pt" }}>
                              <input type="radio" name="motivo-baja" value={v} checked={fmBaja.motivo===v} onChange={()=>setFmBaja(s=>({...s,motivo:v}))} /> {l}
                            </label>
                          ))}
                        </div>
                        {fmBaja.motivo === "OTRO" && (
                          <div style={{ marginBottom: "8px" }}>
                            <Field label="Especifique" value={fmBaja.otroMotivo} onChange={v=>setFmBaja(s=>({...s,otroMotivo:v}))} />
                          </div>
                        )}
                        <div style={{ marginBottom: "8px" }}>
                          <p style={{ fontSize:"9pt", fontWeight:"bold", marginBottom:"2px" }}>Descripción del motivo:</p>
                          <textarea value={fmBaja.descripcion} onChange={e=>setFmBaja(s=>({...s,descripcion:e.target.value}))} rows={3}
                            style={{ width:"100%", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"1px solid #555", resize:"none", outline:"none", fontSize:"10pt", fontFamily:"inherit" }} />
                        </div>

                        <Section title="V. OBSERVACIONES" />
                        <textarea value={fmBaja.observaciones} onChange={e=>setFmBaja(s=>({...s,observaciones:e.target.value}))} rows={2}
                          style={{ width:"100%", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"1px solid #555", resize:"none", outline:"none", fontSize:"10pt", fontFamily:"inherit", marginBottom:"20px" }} />

                        <SignatureRow labels={["Responsable del Área","Jefe de Ing. Biomédica","Jefe de Recursos Materiales","Director(a) General"]} />
                      </div>
                    )}

                    {/* ── ORDEN DE SERVICIO ── */}
                    {formatoActivo === "servicio" && (
                      <div style={{ padding: "24px 32px" }}>
                        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "14px" }}>
                          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: 0 }}>HOSPITAL GENERAL DE ZONA</p>
                          <p style={{ fontWeight: "bold", fontSize: "11pt", margin: "4px 0 0" }}>ORDEN DE SERVICIO</p>
                          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "8px", fontSize: "9pt" }}>
                            <span>Folio:&nbsp;<input value={fmServicio.folio} onChange={e=>setFmServicio(s=>({...s,folio:e.target.value}))} style={iStyle} placeholder="OS-0001" /></span>
                            <span>Fecha:&nbsp;<input type="date" value={fmServicio.fecha} onChange={e=>setFmServicio(s=>({...s,fecha:e.target.value}))} style={iStyle} /></span>
                          </div>
                        </div>

                        <Section title="I. DATOS DEL EQUIPO" />
                        <Grid2>
                          <Field label="Nombre del equipo" value={equipo.nombre} readOnly />
                          <Field label="Servicio / Área" value={equipo.ubicacion ?? ""} readOnly />
                          <Field label="Marca" value={equipo.marca ?? ""} readOnly />
                          <Field label="Modelo" value={equipo.modelo ?? ""} readOnly />
                          <Field label="No. de Serie" value={equipo.numeroSerie ?? ""} readOnly />
                        </Grid2>

                        <Section title="II. TIPO DE TRABAJO" />
                        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", margin: "6px 0 14px" }}>
                          {([["tipoPreventivo","Mantenimiento Preventivo"],["tipoCorrectivo","Mantenimiento Correctivo"],["tipoCalib","Calibración"],["tipoInstalacion","Instalación"],["tipoVerif","Verificación"]] as [keyof typeof fmServicio, string][]).map(([k,l]) => (
                            <label key={k} style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", fontSize:"9.5pt" }}>
                              <input type="checkbox" checked={!!fmServicio[k]} onChange={e=>setFmServicio(s=>({...s,[k]:e.target.checked}))} /> {l}
                            </label>
                          ))}
                        </div>

                        <Section title="III. DESCRIPCIÓN DEL SERVICIO" />
                        <textarea value={fmServicio.descripcion} onChange={e=>setFmServicio(s=>({...s,descripcion:e.target.value}))} rows={4}
                          style={{ width:"100%", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"1px solid #555", resize:"none", outline:"none", fontSize:"10pt", fontFamily:"inherit", marginBottom:"14px" }} />

                        <Section title="IV. REFACCIONES Y MATERIALES UTILIZADOS" />
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"9pt", marginBottom:"14px" }}>
                          <thead>
                            <tr style={{ background:"#f0f0f0" }}>
                              {["No.","Descripción","Cantidad","Costo Unitario","Subtotal"].map(h => (
                                <th key={h} style={{ border:"1px solid #aaa", padding:"4px 8px", textAlign:"left" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[1,2,3,4].map(n => (
                              <tr key={n}>
                                <td style={{ border:"1px solid #aaa", padding:"4px 8px", width:"30px" }}>{n}</td>
                                {[1,2,3,4].map(c => <td key={c} style={{ border:"1px solid #aaa", padding:"4px 8px", minWidth:"80px" }}>&nbsp;</td>)}
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={4} style={{ border:"1px solid #aaa", padding:"4px 8px", textAlign:"right", fontWeight:"bold" }}>Total</td>
                              <td style={{ border:"1px solid #aaa", padding:"4px 8px" }}>&nbsp;</td>
                            </tr>
                          </tbody>
                        </table>

                        <Grid2>
                          <Field label="Técnico responsable" value={fmServicio.tecnico} onChange={v=>setFmServicio(s=>({...s,tecnico:v}))} />
                          <Field label="Calificación del servicio" value={fmServicio.calificacion} onChange={v=>setFmServicio(s=>({...s,calificacion:v}))} />
                        </Grid2>

                        <Section title="V. OBSERVACIONES" />
                        <textarea value={fmServicio.observaciones} onChange={e=>setFmServicio(s=>({...s,observaciones:e.target.value}))} rows={2}
                          style={{ width:"100%", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"1px solid #555", resize:"none", outline:"none", fontSize:"10pt", fontFamily:"inherit", marginBottom:"20px" }} />

                        <SignatureRow labels={["Técnico que realizó el servicio","Jefe de Ing. Biomédica","Responsable del Servicio (recibe)"]} />
                      </div>
                    )}

                    {/* ── RECEPCIÓN DE EQUIPO ── */}
                    {formatoActivo === "recepcion" && (
                      <div style={{ padding: "24px 32px" }}>
                        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "14px" }}>
                          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: 0 }}>HOSPITAL GENERAL DE ZONA</p>
                          <p style={{ fontWeight: "bold", fontSize: "11pt", margin: "4px 0 0" }}>ACTA DE RECEPCIÓN DE EQUIPO MÉDICO</p>
                        </div>

                        <Section title="I. DATOS DEL EQUIPO" />
                        <Grid2>
                          <Field label="Nombre del equipo" value={equipo.nombre} readOnly />
                          <Field label="Servicio / Área de destino" value={equipo.ubicacion ?? ""} readOnly />
                          <Field label="Marca" value={equipo.marca ?? ""} readOnly />
                          <Field label="Modelo" value={equipo.modelo ?? ""} readOnly />
                          <Field label="No. de Serie" value={equipo.numeroSerie ?? ""} readOnly />
                          <Field label="Estado al recibir" value={equipo.estado} readOnly />
                        </Grid2>

                        <Section title="II. DATOS DEL PROVEEDOR" />
                        <Grid2>
                          <Field label="Nombre del proveedor" value={fmRecepcion.proveedor} onChange={v=>setFmRecepcion(s=>({...s,proveedor:v}))} />
                          <Field label="Nombre del contacto" value={fmRecepcion.contacto} onChange={v=>setFmRecepcion(s=>({...s,contacto:v}))} />
                          <Field label="Teléfono" value={fmRecepcion.telefono} onChange={v=>setFmRecepcion(s=>({...s,telefono:v}))} />
                        </Grid2>

                        <Section title="III. DATOS DE ADQUISICIÓN" />
                        <Grid2>
                          <Field label="Fecha de compra" value={fmRecepcion.fechaCompra} onChange={v=>setFmRecepcion(s=>({...s,fechaCompra:v}))} type="date" />
                          <Field label="Costo total ($)" value={fmRecepcion.costo} onChange={v=>setFmRecepcion(s=>({...s,costo:v}))} />
                          <Field label="No. de factura" value={fmRecepcion.factura} onChange={v=>setFmRecepcion(s=>({...s,factura:v}))} />
                        </Grid2>

                        <Section title="IV. INSTALACIÓN Y GARANTÍA" />
                        <Grid2>
                          <Field label="Fecha de instalación" value={fmRecepcion.fechaInstalacion} onChange={v=>setFmRecepcion(s=>({...s,fechaInstalacion:v}))} type="date" />
                          <Field label="Garantía hasta" value={fmRecepcion.garantiaHasta} onChange={v=>setFmRecepcion(s=>({...s,garantiaHasta:v}))} type="date" />
                        </Grid2>

                        <Section title="V. MANUALES ENTREGADOS" />
                        <div style={{ display:"flex", gap:"24px", margin:"6px 0 14px" }}>
                          {([["manualUsuario","Manual de usuario"],["manualServicio","Manual de servicio"],["manualPartes","Manual de partes/refacciones"]] as [keyof typeof fmRecepcion, string][]).map(([k,l]) => (
                            <label key={k} style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", fontSize:"9.5pt" }}>
                              <input type="checkbox" checked={!!fmRecepcion[k]} onChange={e=>setFmRecepcion(s=>({...s,[k]:e.target.checked}))} /> {l}
                            </label>
                          ))}
                        </div>

                        <Section title="VI. PENDIENTES / OBSERVACIONES" />
                        <textarea value={fmRecepcion.pendientes} onChange={e=>setFmRecepcion(s=>({...s,pendientes:e.target.value}))} rows={3}
                          style={{ width:"100%", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"1px solid #555", resize:"none", outline:"none", fontSize:"10pt", fontFamily:"inherit", marginBottom:"14px" }} />

                        <Section title="RECEPCIÓN" />
                        <Grid2>
                          <Field label="Recibió" value={fmRecepcion.recibidoPor} onChange={v=>setFmRecepcion(s=>({...s,recibidoPor:v}))} />
                          <Field label="Cargo" value={fmRecepcion.cargo} onChange={v=>setFmRecepcion(s=>({...s,cargo:v}))} />
                          <Field label="Fecha de recepción" value={fmRecepcion.fechaRecepcion} onChange={v=>setFmRecepcion(s=>({...s,fechaRecepcion:v}))} type="date" />
                        </Grid2>

                        <SignatureRow labels={["Recibió (Ing. Biomédica)","Proveedor / Representante","Responsable del Servicio","Dirección"]} />
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL DE FORMATOS ── */}
        {tab === "historial" && (
          <div className="max-w-4xl">
            <p className="text-xs text-slate-400 mb-5">Formatos guardados para este equipo (recepción, órdenes de servicio, actas de baja).</p>
            {formatosSaved.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 py-14 text-center text-slate-400 text-sm">
                Aún no hay formatos guardados para este equipo.
              </div>
            ) : (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
                {formatosSaved.map(f => {
                  const TIPO_LABEL: Record<string, string> = { BAJA: "Acta de Baja", SERVICIO: "Orden de Servicio", RECEPCION: "Acta de Recepción" };
                  const TIPO_COLOR: Record<string, string> = { BAJA: "bg-red-100 text-red-700", SERVICIO: "bg-amber-100 text-amber-700", RECEPCION: "bg-emerald-100 text-emerald-700" };
                  const datos = (() => { try { return JSON.parse(f.datos); } catch { return {}; } })();
                  return (
                    <div key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIPO_COLOR[f.tipo] ?? "bg-slate-100 text-slate-600"}`}>{TIPO_LABEL[f.tipo] ?? f.tipo}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {f.tipo === "BAJA" && datos.noControl && `No. Control: ${datos.noControl}`}
                            {f.tipo === "SERVICIO" && datos.folio && `Folio: ${datos.folio}`}
                            {f.tipo === "RECEPCION" && datos.proveedor && `Proveedor: ${datos.proveedor}`}
                            {!datos.noControl && !datos.folio && !datos.proveedor && "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(f.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                            {f.creadoPor && ` · ${f.creadoPor.nombre}${f.creadoPor.apellidos ? " " + f.creadoPor.apellidos : ""}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setHistorialView(f)}
                        className="text-xs text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1">
                        Ver <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Historial: View Modal ── */}
      {historialView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-auto py-6 no-print"
          onClick={e => { if (e.target === e.currentTarget) setHistorialView(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
              <p className="font-semibold text-slate-800 text-sm">
                {{ BAJA: "Acta de Baja", SERVICIO: "Orden de Servicio", RECEPCION: "Acta de Recepción" }[historialView.tipo] ?? historialView.tipo}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700">
                  <Printer size={14} /> Imprimir
                </button>
                <button onClick={() => setHistorialView(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div id="fmt-doc" className="p-6 text-sm text-slate-700 space-y-3">
              {(() => {
                const datos = (() => { try { return JSON.parse(historialView.datos); } catch { return {}; } })();
                return Object.entries(datos).map(([k, v]) => {
                  if (typeof v === "boolean") return null;
                  if (!v) return null;
                  const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                  return (
                    <div key={k} className="border-b border-slate-100 pb-2">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</span>
                      <p className="text-slate-800 mt-0.5">{String(v)}</p>
                    </div>
                  );
                });
              })()}
              <p className="text-xs text-slate-400 pt-2">
                Guardado el {new Date(historialView.createdAt).toLocaleString("es-MX")}
                {historialView.creadoPor && ` por ${historialView.creadoPor.nombre}${historialView.creadoPor.apellidos ? " " + historialView.creadoPor.apellidos : ""}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Mantenimiento: Form Modal ── */}
      {showMantForm && equipo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Wrench size={16} className="text-amber-500" />
                {editMant ? "Editar mantenimiento" : "Nuevo mantenimiento"}
              </h2>
              <button onClick={() => setShowMantForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault(); setSavingMant(true); setMantError("");
              const body = { tipo: mantForm.tipo, fecha: mantForm.fecha, descripcion: JSON.stringify(mantFormato), tecnico: mantForm.tecnico || null, costo: mantForm.costo ? Number(mantForm.costo) : null, proximoMantenimiento: mantForm.proximoMantenimiento || null, nuevoEstado: mantForm.nuevoEstado || null };
              const url = editMant ? `/api/equipos/${id}/mantenimientos/${editMant.id}` : `/api/equipos/${id}/mantenimientos`;
              const res = await fetch(url, { method: editMant ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
              if (res.ok) { loadMantenimientos(); setShowMantForm(false); }
              else { const d = await res.json(); setMantError(d.error ?? "Error al guardar"); }
              setSavingMant(false);
            }} className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Datos generales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select required value={mantForm.tipo} onChange={e => { setMantForm(f=>({...f,tipo:e.target.value})); const ch:Record<string,boolean>={}; getMantChecklist(e.target.value).forEach(i=>{ch[i.id]=false;}); setMantFormato(f=>({...f,checklist:ch})); }} className={inputCls}>
                    <option value="PREVENTIVO">Preventivo</option><option value="CORRECTIVO">Correctivo</option><option value="CALIBRACION">Calibración</option><option value="LIMPIEZA">Limpieza</option><option value="VERIFICACION">Verificación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input required type="date" value={mantForm.fecha} onChange={e=>setMantForm(f=>({...f,fecha:e.target.value}))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Técnico responsable</label>
                  <input value={mantForm.tecnico} onChange={e=>setMantForm(f=>({...f,tecnico:e.target.value}))} className={inputCls} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Costo (MXN)</label>
                  <input type="number" min="0" step="0.01" value={mantForm.costo} onChange={e=>setMantForm(f=>({...f,costo:e.target.value}))} className={inputCls} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label>
                  <input type="date" value={mantForm.proximoMantenimiento} onChange={e=>setMantForm(f=>({...f,proximoMantenimiento:e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado del equipo</label>
                  <select value={mantForm.nuevoEstado} onChange={e=>setMantForm(f=>({...f,nuevoEstado:e.target.value}))} className={inputCls}>
                    <option value="">No cambiar</option><option value="ACTIVO">Activo</option><option value="EN_MANTENIMIENTO">En mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              {/* Checklist */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lista de verificación</p>
                <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-200 grid grid-cols-2 gap-1.5">
                  {getMantChecklist(mantForm.tipo).map(item => (
                    <button key={item.id} type="button" onClick={() => setMantFormato(f=>({...f,checklist:{...f.checklist,[item.id]:!f.checklist[item.id]}}))}
                      className="flex items-center gap-2 text-sm text-left px-2 py-1 rounded-lg hover:bg-white transition-colors">
                      {mantFormato.checklist[item.id] ? <CheckSquare size={15} className="text-emerald-600 shrink-0" /> : <Square size={15} className="text-slate-300 shrink-0" />}
                      <span className={mantFormato.checklist[item.id] ? "text-slate-800" : "text-slate-400"}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Detalle */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Trabajo realizado / Observaciones</label>
                  <textarea value={mantFormato.observaciones} onChange={e=>setMantFormato(f=>({...f,observaciones:e.target.value}))} rows={3} className={inputCls+" resize-none"} placeholder="Describe el trabajo realizado…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hallazgos</label>
                  <textarea value={mantFormato.hallazgos} onChange={e=>setMantFormato(f=>({...f,hallazgos:e.target.value}))} rows={2} className={inputCls+" resize-none"} placeholder="Hallazgos encontrados…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Piezas / Partes reemplazadas</label>
                  <textarea value={mantFormato.piezasReemplazadas} onChange={e=>setMantFormato(f=>({...f,piezasReemplazadas:e.target.value}))} rows={2} className={inputCls+" resize-none"} placeholder="Lista de refacciones utilizadas…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado final del equipo</label>
                  <select value={mantFormato.estadoFinal} onChange={e=>setMantFormato(f=>({...f,estadoFinal:e.target.value}))} className={inputCls}>
                    <option value="OPERATIVO">Operativo</option><option value="REQUIERE_SEGUIMIENTO">Requiere seguimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              {mantError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{mantError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingMant} className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {savingMant ? "Guardando…" : editMant ? "Guardar cambios" : "Guardar formato"}
                </button>
                <button type="button" onClick={()=>setShowMantForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mantenimiento: Print Modal ── */}
      {printMant && equipo && (() => {
        const fmt = parseMantFormato(printMant.descripcion);
        const items = getMantChecklist(printMant.tipo);
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <style>{`@media print { body > * { display:none!important; } #mant-print-doc { display:block!important; position:fixed; inset:0; background:white; z-index:9999; padding:32px; overflow:auto; } }`}</style>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Printer size={16} className="text-amber-500" /> Formato de Mantenimiento</h2>
                <div className="flex items-center gap-2">
                  <button onClick={()=>window.print()} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"><Printer size={14} /> Imprimir</button>
                  <button onClick={()=>setPrintMant(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <div id="mant-print-doc" className="border-2 border-slate-900 rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                    <div><p className="font-bold text-sm uppercase tracking-wide">Hospital — {equipo.ubicacion ?? "Urgencias"}</p><p className="text-xs text-slate-300 mt-0.5">Formato de Registro de Mantenimiento</p></div>
                    <div className="text-right"><p className="text-xs text-slate-300">Folio</p><p className="font-mono text-sm font-bold">{printMant.id.slice(-8).toUpperCase()}</p></div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-200 text-sm">
                    <p className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Datos del Equipo</p>
                    {[["Equipo",equipo.nombre],["Ubicación",equipo.ubicacion??"—"],["Marca",equipo.marca??"—"],["Modelo",equipo.modelo??"—"],["N° Serie",equipo.numeroSerie??"—"],["Tipo",printMant.tipo.charAt(0)+printMant.tipo.slice(1).toLowerCase()],["Fecha",new Date(printMant.fecha).toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})],["Técnico",printMant.tecnico??"—"]].map(([l,v])=>(
                      <div key={l}><span className="text-xs text-slate-400">{l}: </span><span className="font-medium text-slate-800">{v}</span></div>
                    ))}
                    {printMant.proximoMantenimiento && <div><span className="text-xs text-slate-400">Próximo: </span><span className="font-medium text-slate-800">{new Date(printMant.proximoMantenimiento).toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</span></div>}
                  </div>
                  <div className="p-4 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lista de Verificación</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {items.map(item => {
                        const checked = fmt?.checklist?.[item.id] ?? false;
                        return <div key={item.id} className="flex items-center gap-2 text-sm">{checked?<CheckSquare size={14} className="text-emerald-600 shrink-0"/>:<Square size={14} className="text-slate-300 shrink-0"/>}<span className={checked?"text-slate-800":"text-slate-400"}>{item.label}</span></div>;
                      })}
                    </div>
                  </div>
                  {fmt && <>
                    {fmt.observaciones && <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trabajo Realizado / Observaciones</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.observaciones}</p></div>}
                    {fmt.hallazgos && <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hallazgos</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.hallazgos}</p></div>}
                    {fmt.piezasReemplazadas && <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Piezas / Partes Reemplazadas</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{fmt.piezasReemplazadas}</p></div>}
                    <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estado Final</p><p className="text-sm font-semibold text-slate-800">{fmt.estadoFinal==="OPERATIVO"?"✓ Operativo":fmt.estadoFinal==="REQUIERE_SEGUIMIENTO"?"⚠ Requiere seguimiento":"✗ Fuera de servicio"}</p></div>
                  </>}
                  {!fmt && printMant.descripcion && <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{printMant.descripcion}</p></div>}
                  <div className="p-4 grid grid-cols-2 gap-8">
                    {["Técnico responsable","Jefe de área / Vo. Bo."].map(l=>(
                      <div key={l}><div className="border-b border-slate-400 mb-1 pb-6"/><p className="text-xs text-center text-slate-500">{l}</p>{l==="Técnico responsable"&&printMant.tecnico&&<p className="text-xs text-center font-medium text-slate-700">{printMant.tecnico}</p>}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Helper sub-components ── */
const iStyle: React.CSSProperties = { border: "none", borderBottom: "1px solid #555", outline: "none", fontSize: "inherit", fontFamily: "inherit", background: "transparent", width: "120px" };

function Section({ title }: { title: string }) {
  return <p style={{ fontWeight: "bold", fontSize: "9.5pt", background: "#e8e8e8", padding: "3px 8px", margin: "12px 0 6px", borderLeft: "3px solid #555" }}>{title}</p>;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginBottom: "4px" }}>{children}</div>;
}

function Field({ label, value, onChange, readOnly, type = "text" }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; type?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: "6px" }}>
      <span style={{ fontSize: "8pt", color: "#555", fontWeight: "bold", marginBottom: "1px" }}>{label}</span>
      <input type={type} value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)}
        style={{ border: "none", borderBottom: "1px solid #555", outline: "none", fontSize: "10pt", fontFamily: "inherit", background: "transparent", padding: "2px 0", color: readOnly ? "#333" : "#000" }} />
    </div>
  );
}

function SignatureRow({ labels }: { labels: string[] }) {
  return (
    <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
      {labels.map(l => (
        <div key={l} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderBottom: "1px solid #000", height: "40px" }} />
          <p style={{ fontSize: "8pt", marginTop: "4px", color: "#333" }}>{l}</p>
          <p style={{ fontSize: "7.5pt", color: "#666", margin: "1px 0" }}>Nombre y firma</p>
        </div>
      ))}
    </div>
  );
}
