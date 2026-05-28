"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Search, X, RefreshCw, Plus, QrCode, Wrench,
  Pencil, CheckCircle, AlertTriangle, Filter,
  ChevronDown, ChevronRight, Clock, ClipboardList, MapPin,
  CheckSquare, Square, Printer,
} from "lucide-react";
import QRModal from "./QRModal";

// ─── urgencias areas ──────────────────────────────────────────────────────────
const URGENCIAS_AREAS = [
  "Sala de Choque",
  "Central de Enfermeras",
  "Sala de Curaciones",
  "Sala de Yesos",
  "Sala de Rayos X",
  "Cuarto de Ultrasonido",
  "Laboratorio Clínico de Urgencias",
  "Banco de Sangre / Área de Transfusión",
  "Cuarto de Medicamentos",
  "Cuarto de Material Estéril",
  "Cuarto de Ropa Limpia",
  "Cuarto de Ropa Sucia",
  "Cuarto de Limpieza",
  "Hidratación Pediátrica",
  "Hidratación Adultos",
  "Almacén de Equipos y Suministros",
  "Archivo de Expedientes",
  "Vestidor de Personal",
  "Área de Trabajo de Enfermería",
  "Cubículo de Observación General 1",
  "Cubículo de Observación General 2",
  "Cubículo de Observación General 3",
  "Cubículo de Observación General 4",
  "Cubículo de Observación General 5",
  "Cubículo de Observación General 6",
  "Cubículo de Observación Pediátrica 1",
  "Cubículo de Observación Pediátrica 2",
  "Cubículo de Aislamiento 1",
  "Cubículo de Aislamiento 2",
  "Cubículo de Triage 1",
  "Cubículo de Triage 2",
  "Cubículo de Triage 3",
  "Módulo de Recepción y Control",
  "Área de Descontaminación",
  "Estación de Camillas",
  "Estación de Sillas de Ruedas",
  "Oficina del Médico Responsable",
  "Pasillo de Ambulancias",
  "Sala de Espera",
  "Sala de Juntas y Trabajo Médico",
  "Sanitario Personal (Hombres)",
  "Sanitario Personal (Mujeres)",
  "Sanitario Público (Hombres)",
  "Sanitario Público (Mujeres)",
];
const URGENCIAS_SET = new Set(URGENCIAS_AREAS);

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

// ─── constants ────────────────────────────────────────────────────────────────
const ESTADO_CFG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  ACTIVO:            { label: "Activo",            color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "bg-red-100 text-red-600 ring-1 ring-red-200",             dot: "bg-red-500",    icon: AlertTriangle },
};
const TIPO_MANT = ["PREVENTIVO", "CORRECTIVO", "CALIBRACION", "VERIFICACION"] as const;
const emptyForm = { nombre: "", marca: "", modelo: "", numeroSerie: "", fechaAdquisicion: "", ubicacion: "", estado: "ACTIVO", descripcion: "" };
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

// ── Formato helpers ───────────────────────────────────────────────────────────
interface FormatoData { version: 2; observaciones: string; hallazgos: string; piezasReemplazadas: string; estadoFinal: string; checklist: Record<string, boolean>; }
const MANT_CHECKLIST: Record<string, { id: string; label: string }[]> = {
  PREVENTIVO:  [{id:"limpiezaExterior",label:"Limpieza exterior"},{id:"limpiezaInterior",label:"Limpieza interior / filtros"},{id:"revisionCables",label:"Revisión de cables y conexiones"},{id:"inspeccionVisual",label:"Inspección visual"},{id:"lubricacion",label:"Lubricación de piezas móviles"},{id:"pruebaFuncionamiento",label:"Prueba de funcionamiento"},{id:"calibracion",label:"Verificación de calibración"},{id:"revisionAlarmas",label:"Revisión de alarmas"},{id:"pruebaSeguridad",label:"Prueba de seguridad eléctrica"},{id:"documentacion",label:"Documentación actualizada"}],
  CORRECTIVO:  [{id:"diagnostico",label:"Diagnóstico de falla"},{id:"reparacion",label:"Reparación realizada"},{id:"pruebaFuncionamiento",label:"Prueba post-reparación"},{id:"calibracion",label:"Calibración post-reparación"},{id:"pruebaSeguridad",label:"Prueba de seguridad eléctrica"},{id:"limpiezaGeneral",label:"Limpieza general"},{id:"documentacion",label:"Documentación actualizada"}],
  DEFAULT:     [{id:"inspeccionVisual",label:"Inspección visual"},{id:"limpiezaGeneral",label:"Limpieza general"},{id:"pruebaFuncionamiento",label:"Prueba de funcionamiento"},{id:"documentacion",label:"Documentación actualizada"}],
};
function getMantChecklist(tipo: string) { return MANT_CHECKLIST[tipo] ?? MANT_CHECKLIST.DEFAULT; }
function emptyMantFormato(tipo: string): FormatoData { const ch:Record<string,boolean>={}; getMantChecklist(tipo).forEach(i=>{ch[i.id]=false;}); return {version:2,observaciones:"",hallazgos:"",piezasReemplazadas:"",estadoFinal:"OPERATIVO",checklist:ch}; }
function parseMantFormato(desc?: string): FormatoData | null { if(!desc) return null; try { const d=JSON.parse(desc); return d.version===2?d:null; } catch { return null; } }

// ─── StatusBadge ──────────────────────────────────────────────────────────────
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
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-75 transition-opacity ${cfg.color}`}>
        <Icon size={11} /> {cfg.label} <ChevronDown size={10} className="ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 overflow-hidden min-w-max">
          {Object.entries(ESTADO_CFG).map(([key, c]) => {
            const CI = c.icon;
            return (
              <button key={key} onClick={e => { e.stopPropagation(); onChange(key); setOpen(false); }}
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

// ─── MantModal ────────────────────────────────────────────────────────────────
function MantModal({ equipo, onClose, onSaved }: { equipo: Equipo; onClose: () => void; onSaved: () => void }) {
  const [records, setRecords] = useState<Mant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRec, setEditRec] = useState<Mant | null>(null);
  const [printRec, setPrintRec] = useState<Mant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo:"PREVENTIVO", fecha:new Date().toISOString().slice(0,10), tecnico:"", costo:"", proximoMantenimiento:"", nuevoEstado:"" });
  const [formato, setFormato] = useState<FormatoData>(emptyMantFormato("PREVENTIVO"));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => { setLoading(true); const d = await fetch(`/api/equipos/${equipo.id}/mantenimientos`).then(r => r.json()); setRecords(Array.isArray(d) ? d : []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditRec(null); setForm({tipo:"PREVENTIVO",fecha:new Date().toISOString().slice(0,10),tecnico:"",costo:"",proximoMantenimiento:"",nuevoEstado:""}); setFormato(emptyMantFormato("PREVENTIVO")); setErr(""); setShowForm(true); };
  const openEdit = (r: Mant) => { setEditRec(r); setForm({tipo:r.tipo,fecha:new Date(r.fecha).toISOString().slice(0,10),tecnico:r.tecnico??"",costo:r.costo?.toString()??"",proximoMantenimiento:r.proximoMantenimiento?new Date(r.proximoMantenimiento).toISOString().slice(0,10):"",nuevoEstado:""}); setFormato(parseMantFormato(r.descripcion)??emptyMantFormato(r.tipo)); setErr(""); setShowForm(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const body = { tipo:form.tipo, fecha:form.fecha, descripcion:JSON.stringify(formato), tecnico:form.tecnico||null, costo:form.costo?Number(form.costo):null, proximoMantenimiento:form.proximoMantenimiento||null, nuevoEstado:form.nuevoEstado||null };
    const url = editRec ? `/api/equipos/${equipo.id}/mantenimientos/${editRec.id}` : `/api/equipos/${equipo.id}/mantenimientos`;
    const res = await fetch(url, { method: editRec?"PATCH":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (res.ok) { await load(); setShowForm(false); onSaved(); }
    else { const d = await res.json(); setErr(d.error ?? "Error al guardar"); }
    setSaving(false);
  };

  if (showForm) return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Wrench size={16} className="text-amber-500" />{editRec?"Editar":"Nuevo"} mantenimiento — {equipo.nombre}</h2>
          <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
              <select required value={form.tipo} onChange={e=>{setForm(f=>({...f,tipo:e.target.value}));setFormato(emptyMantFormato(e.target.value));}} className={inputCls}>
                {TIPO_MANT.map(t=><option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label><input required type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Técnico</label><input value={form.tecnico} onChange={e=>setForm(f=>({...f,tecnico:e.target.value}))} className={inputCls} placeholder="Nombre del técnico" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Costo (MXN)</label><input type="number" min="0" step="0.01" value={form.costo} onChange={e=>setForm(f=>({...f,costo:e.target.value}))} className={inputCls} placeholder="0.00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Próximo mantenimiento</label><input type="date" value={form.proximoMantenimiento} onChange={e=>setForm(f=>({...f,proximoMantenimiento:e.target.value}))} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Actualizar estado</label>
              <select value={form.nuevoEstado} onChange={e=>setForm(f=>({...f,nuevoEstado:e.target.value}))} className={inputCls}>
                <option value="">Sin cambio</option><option value="ACTIVO">Activo</option><option value="EN_MANTENIMIENTO">En mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lista de verificación</p>
            <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-200 grid grid-cols-2 gap-1.5">
              {getMantChecklist(form.tipo).map(item=>(
                <button key={item.id} type="button" onClick={()=>setFormato(f=>({...f,checklist:{...f.checklist,[item.id]:!f.checklist[item.id]}}))}
                  className="flex items-center gap-2 text-sm text-left px-2 py-1 rounded-lg hover:bg-white transition-colors">
                  {formato.checklist[item.id]?<CheckSquare size={14} className="text-emerald-600 shrink-0"/>:<Square size={14} className="text-slate-300 shrink-0"/>}
                  <span className={formato.checklist[item.id]?"text-slate-800":"text-slate-400"}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Trabajo realizado / Observaciones</label><textarea value={formato.observaciones} onChange={e=>setFormato(f=>({...f,observaciones:e.target.value}))} rows={3} className={inputCls+" resize-none"} placeholder="Describe el trabajo realizado…" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Hallazgos</label><textarea value={formato.hallazgos} onChange={e=>setFormato(f=>({...f,hallazgos:e.target.value}))} rows={2} className={inputCls+" resize-none"} placeholder="Hallazgos encontrados…" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Piezas / Partes reemplazadas</label><textarea value={formato.piezasReemplazadas} onChange={e=>setFormato(f=>({...f,piezasReemplazadas:e.target.value}))} rows={2} className={inputCls+" resize-none"} /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Estado final del equipo</label>
              <select value={formato.estadoFinal} onChange={e=>setFormato(f=>({...f,estadoFinal:e.target.value}))} className={inputCls}>
                <option value="OPERATIVO">Operativo</option><option value="REQUIERE_SEGUIMIENTO">Requiere seguimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
              </select>
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">{saving?"Guardando…":editRec?"Guardar cambios":"Guardar formato"}</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-200 hover:bg-slate-300">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );

  if (printRec) {
    const fmt = parseMantFormato(printRec.descripcion);
    const items = getMantChecklist(printRec.tipo);
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <style>{`@media print { body > * { display:none!important; } #mant-inv-print { display:block!important; position:fixed; inset:0; background:white; z-index:9999; padding:32px; overflow:auto; } }`}</style>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Printer size={16} className="text-amber-500" /> Formato de Mantenimiento</h2>
            <div className="flex items-center gap-2">
              <button onClick={()=>window.print()} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg"><Printer size={14} /> Imprimir</button>
              <button onClick={()=>setPrintRec(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            <div id="mant-inv-print" className="border-2 border-slate-900 rounded-lg overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                <div><p className="font-bold text-sm uppercase tracking-wide">Urgencias</p><p className="text-xs text-slate-300 mt-0.5">Formato de Registro de Mantenimiento</p></div>
                <div className="text-right"><p className="text-xs text-slate-300">Folio</p><p className="font-mono text-sm font-bold">{printRec.id.slice(-8).toUpperCase()}</p></div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-200 text-sm">
                <p className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Datos del Equipo</p>
                {[["Equipo",equipo.nombre],["Ubicación",equipo.ubicacion??"—"],["Tipo",printRec.tipo.charAt(0)+printRec.tipo.slice(1).toLowerCase()],["Fecha",new Date(printRec.fecha).toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})],["Técnico",printRec.tecnico??"—"]].map(([l,v])=>(
                  <div key={l}><span className="text-xs text-slate-400">{l}: </span><span className="font-medium text-slate-800">{v}</span></div>
                ))}
              </div>
              <div className="p-4 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lista de Verificación</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {items.map(item=>{const c=fmt?.checklist?.[item.id]??false;return <div key={item.id} className="flex items-center gap-2 text-sm">{c?<CheckSquare size={14} className="text-emerald-600 shrink-0"/>:<Square size={14} className="text-slate-300 shrink-0"/>}<span className={c?"text-slate-800":"text-slate-400"}>{item.label}</span></div>;})}
                </div>
              </div>
              {fmt&&<>
                {fmt.observaciones&&<div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Trabajo / Observaciones</p><p className="text-sm whitespace-pre-wrap">{fmt.observaciones}</p></div>}
                {fmt.hallazgos&&<div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Hallazgos</p><p className="text-sm whitespace-pre-wrap">{fmt.hallazgos}</p></div>}
                {fmt.piezasReemplazadas&&<div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Piezas Reemplazadas</p><p className="text-sm whitespace-pre-wrap">{fmt.piezasReemplazadas}</p></div>}
                <div className="p-4 border-b border-slate-200"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Estado Final</p><p className="text-sm font-semibold">{fmt.estadoFinal==="OPERATIVO"?"✓ Operativo":fmt.estadoFinal==="REQUIERE_SEGUIMIENTO"?"⚠ Requiere seguimiento":"✗ Fuera de servicio"}</p></div>
              </>}
              <div className="p-4 grid grid-cols-2 gap-8">
                {["Técnico responsable","Jefe de área / Vo. Bo."].map(l=>(<div key={l}><div className="border-b border-slate-400 mb-1 pb-6"/><p className="text-xs text-center text-slate-500">{l}</p></div>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <button onClick={openNew} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium transition-colors ring-1 ring-amber-200">
            <Plus size={15} /> Registrar nuevo mantenimiento
          </button>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><ClipboardList size={13} /> Historial ({records.length})</p>
            {loading ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Sin registros de mantenimiento</div>
            ) : (
              <div className="space-y-2">
                {records.map(r => {
                  const fmt = parseMantFormato(r.descripcion);
                  return (
                    <div key={r.id} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-100 group">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Wrench size={13} className="text-amber-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700">{r.tipo.charAt(0)+r.tipo.slice(1).toLowerCase()}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Clock size={11} />{new Date(r.fecha).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}</span>
                        </div>
                        {r.tecnico&&<p className="text-xs text-slate-500 mt-0.5">Técnico: {r.tecnico}</p>}
                        {fmt?<p className="text-xs text-emerald-600 mt-0.5">Formato completo</p>:r.descripcion?<p className="text-xs text-slate-500 mt-0.5 truncate">{r.descripcion}</p>:null}
                        {r.proximoMantenimiento&&<p className="text-xs text-amber-600 mt-0.5">Próximo: {new Date(r.proximoMantenimiento).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.costo!=null&&<span className="text-xs font-medium text-slate-500">${r.costo.toLocaleString("es-MX")}</span>}
                        <button onClick={()=>setPrintRec(r)} title="Imprimir" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Printer size={12} /></button>
                        <button onClick={()=>openEdit(r)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Pencil size={12} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const router = useRouter();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [qrEquipo, setQrEquipo] = useState<Equipo | null>(null);
  const [mantEquipo, setMantEquipo] = useState<Equipo | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editEq, setEditEq] = useState<Equipo | null>(null);
  const [newArea, setNewArea] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async (initial = false) => {
    if (initial) setLoading(true);
    const d = await fetch("/api/equipos").then(r => r.json()).catch(() => []);
    setEquipos(Array.isArray(d) ? d.filter((e: Equipo) => URGENCIAS_SET.has(e.ubicacion ?? "")) : []);
    if (initial) setLoading(false);
  };
  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 2000);
    return () => clearInterval(interval);
  }, []);

  const equiposByArea = useMemo(() => {
    const map: Record<string, Equipo[]> = {};
    equipos.forEach(eq => {
      const key = eq.ubicacion ?? "Sin área";
      if (!map[key]) map[key] = [];
      map[key].push(eq);
    });
    return map;
  }, [equipos]);

  // areas that actually have equipos, in URGENCIAS_AREAS order
  const areas = useMemo(() => URGENCIAS_AREAS.filter(a => equiposByArea[a]?.length > 0), [equiposByArea]);

  // filter devices within each area
  const filteredByArea = useMemo(() => {
    const q = search.toLowerCase();
    const result: Record<string, Equipo[]> = {};
    areas.forEach(area => {
      result[area] = (equiposByArea[area] ?? []).filter(eq =>
        (eq.nombre.toLowerCase().includes(q) || (eq.numeroSerie ?? "").toLowerCase().includes(q) || (eq.marca ?? "").toLowerCase().includes(q)) &&
        (filterEstado === "TODOS" || eq.estado === filterEstado)
      );
    });
    return result;
  }, [equiposByArea, areas, search, filterEstado]);

  const globalStats = useMemo(() => ({
    total:   equipos.length,
    activos: equipos.filter(e => e.estado === "ACTIVO").length,
    enMant:  equipos.filter(e => e.estado === "EN_MANTENIMIENTO").length,
    fuera:   equipos.filter(e => e.estado === "FUERA_DE_SERVICIO").length,
  }), [equipos]);

  const toggleArea = (area: string) => {
    setOpenAreas(prev => {
      const next = new Set(prev);
      next.has(area) ? next.delete(area) : next.add(area);
      return next;
    });
  };

  const handleStatusChange = async (id: string, newEstado: string) => {
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, estado: newEstado } : e));
    await fetch(`/api/equipos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: newEstado }) });
  };

  const openNew = (area = "") => { setNewArea(area); setForm({ ...emptyForm, ubicacion: area }); setFormError(""); setShowNew(true); };
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

  const isFiltering = search || filterEstado !== "TODOS";

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Activity size={16} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Inventario de Urgencias</h1>
          {!loading && <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{equipos.length} equipos</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => openNew()} className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <Plus size={15} /> Nuevo dispositivo
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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

        {/* filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar dispositivo, serie, marca…"
              className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-red-500" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
            </select>
          </div>
          {isFiltering && (
            <button onClick={() => { setSearch(""); setFilterEstado("TODOS"); }} className="text-sm text-red-600 hover:text-red-800 font-medium">Limpiar</button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {areas.map(area => {
              const areaEqs = filteredByArea[area] ?? [];
              const allEqs = equiposByArea[area] ?? [];
              const isOpen = openAreas.has(area) || (isFiltering && areaEqs.length > 0);
              const fuera = allEqs.filter(e => e.estado === "FUERA_DE_SERVICIO").length;
              const enMant = allEqs.filter(e => e.estado === "EN_MANTENIMIENTO").length;

              // hide area if filtering and no matches
              if (isFiltering && areaEqs.length === 0) return null;

              return (
                <div key={area} className="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
                  {/* area header */}
                  <button onClick={() => toggleArea(area)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                      <MapPin size={13} className="text-red-400 shrink-0" />
                      <span className="font-medium text-slate-800 text-sm">{area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {allEqs.length} {allEqs.length === 1 ? "equipo" : "equipos"}
                      </span>
                      {fuera > 0 && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-0.5"><AlertTriangle size={9} /> {fuera}</span>}
                      {enMant > 0 && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5"><Wrench size={9} /> {enMant}</span>}
                      <button onClick={e => { e.stopPropagation(); openNew(area); }}
                        className="ml-1 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors">
                        <Plus size={11} /> Agregar
                      </button>
                    </div>
                  </button>

                  {/* devices table */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {areaEqs.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400 text-center">Sin resultados en esta área</p>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-5 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dispositivo</th>
                              <th className="px-5 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">N° Serie</th>
                              <th className="px-5 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                              <th className="px-5 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Último mant.</th>
                              <th className="px-5 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {areaEqs.map(eq => {
                              const cfg = ESTADO_CFG[eq.estado] ?? { dot: "bg-slate-400" };
                              const ultimo = eq.mantenimientos[eq.mantenimientos.length - 1];
                              return (
                                <tr key={eq.id} onClick={() => router.push(`/dashboard/equipos/${eq.id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 group-hover:text-red-600 transition-colors">{eq.nombre}</p>
                                        {(eq.marca || eq.modelo) && <p className="text-xs text-slate-400">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-sm text-slate-600 font-mono">{eq.numeroSerie || "—"}</td>
                                  <td className="px-5 py-3">
                                    <StatusBadge estado={eq.estado} onChange={s => handleStatusChange(eq.id, s)} />
                                  </td>
                                  <td className="px-5 py-3 text-sm text-slate-500">
                                    {ultimo ? new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "Sin registro"}
                                  </td>
                                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => setQrEquipo(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Ver QR"><QrCode size={13} /></button>
                                      <button onClick={() => setMantEquipo(eq)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Mantenimientos"><Wrench size={13} /></button>
                                      <button onClick={() => openEdit(eq)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Editar"><Pencil size={13} /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* modals */}
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
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label><input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Monitor de signos vitales" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Marca</label><input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className={inputCls} placeholder="Philips" /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label><input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">N° de serie</label><input value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Fecha de adquisición</label><input type="date" value={form.fechaAdquisicion} onChange={e => setForm({ ...form, fechaAdquisicion: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Área</label>
                  <select value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} className={inputCls}>
                    <option value="">Seleccionar área…</option>
                    {URGENCIAS_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className={inputCls}>
                    <option value="ACTIVO">Activo</option><option value="EN_MANTENIMIENTO">En mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label><textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls + " resize-none"} /></div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{saving ? "Guardando…" : editEq ? "Guardar cambios" : "Registrar dispositivo"}</button>
                <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
