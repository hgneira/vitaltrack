"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  UserCircle, Phone, Mail, MapPin, AlertTriangle, FileText,
  PhoneCall, ArrowLeft, Calendar, Pencil, X, Plus, Trash2,
  ChevronDown, ChevronUp, ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  alergias?: string;
  antecedentes?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
}

interface NotaSOAP {
  id: string;
  subjetivo?: string;
  objetivo?: string;
  analisis?: string;
  plan?: string;
  diagnostico?: string;
  tratamiento?: string;
  evolucion?: string;
  createdAt: string;
  creadoPor: { nombre: string; apellidos?: string };
}

interface Expediente {
  id: string;
  createdAt: string;
  medico: { nombre: string; apellidos?: string };
  notas: NotaSOAP[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const textareaClass = `${inputClass} resize-none`;

const SOAP_FIELDS: { key: keyof Omit<NotaSOAP, "id" | "createdAt" | "creadoPor">; label: string; color: string }[] = [
  { key: "subjetivo",   label: "S — Subjetivo",         color: "text-violet-700 bg-violet-50" },
  { key: "objetivo",    label: "O — Objetivo",           color: "text-blue-700 bg-blue-50" },
  { key: "analisis",    label: "A — Análisis",           color: "text-amber-700 bg-amber-50" },
  { key: "plan",        label: "P — Plan",               color: "text-emerald-700 bg-emerald-50" },
  { key: "diagnostico", label: "Diagnóstico",            color: "text-red-700 bg-red-50" },
  { key: "tratamiento", label: "Tratamiento",            color: "text-cyan-700 bg-cyan-50" },
  { key: "evolucion",   label: "Evolución",              color: "text-slate-700 bg-slate-50" },
];

const emptyNota = { subjetivo: "", objetivo: "", analisis: "", plan: "", diagnostico: "", tratamiento: "", evolucion: "" };

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DetallePacientePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loadingPaciente, setLoadingPaciente] = useState(true);
  const [loadingExp, setLoadingExp] = useState(true);

  // Edit patient modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Paciente>>({});
  const [saving, setSaving] = useState(false);

  // Nota SOAP modal
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaSOAP | null>(null);
  const [notaForm, setNotaForm] = useState(emptyNota);
  const [savingNota, setSavingNota] = useState(false);

  // Delete nota confirm
  const [deleteNota, setDeleteNota] = useState<NotaSOAP | null>(null);
  const [deletingNota, setDeletingNota] = useState(false);

  // Expanded notas
  const [expandedNota, setExpandedNota] = useState<string | null>(null);

  // Creating expediente
  const [creatingExp, setCreatingExp] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadPaciente = () =>
    fetch(`/api/pacientes/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setPaciente(d?.id ? d : null); setLoadingPaciente(false); });

  const loadExpediente = () =>
    fetch(`/api/expedientes?pacienteId=${params.id}`)
      .then((r) => r.json())
      .then((d) => { setExpediente(d?.id ? d : null); setLoadingExp(false); });

  useEffect(() => {
    loadPaciente();
    loadExpediente();
  }, [params.id]);

  // Open edit modal if ?edit=1 in URL
  useEffect(() => {
    if (paciente && searchParams.get("edit") === "1") {
      openEdit(paciente);
      router.replace(`/dashboard/pacientes/${params.id}`);
    }
  }, [paciente, searchParams]);

  // ── Edit patient ──────────────────────────────────────────────────────────────

  const openEdit = (p: Paciente) => {
    setEditForm({
      nombre: p.nombre,
      apellidos: p.apellidos,
      fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.slice(0, 10) : "",
      sexo: p.sexo,
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      direccion: p.direccion ?? "",
      alergias: p.alergias ?? "",
      antecedentes: p.antecedentes ?? "",
      contactoEmergencia: p.contactoEmergencia ?? "",
      telefonoEmergencia: p.telefonoEmergencia ?? "",
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/pacientes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) { await loadPaciente(); setShowEdit(false); }
    setSaving(false);
  };

  // ── Expediente ────────────────────────────────────────────────────────────────

  const handleCreateExpediente = async () => {
    setCreatingExp(true);
    await fetch("/api/expedientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pacienteId: params.id }),
    });
    await loadExpediente();
    setCreatingExp(false);
  };

  // ── Notas SOAP ────────────────────────────────────────────────────────────────

  const openNewNota = () => { setEditingNota(null); setNotaForm(emptyNota); setShowNotaForm(true); };

  const openEditNota = (nota: NotaSOAP) => {
    setEditingNota(nota);
    setNotaForm({
      subjetivo: nota.subjetivo ?? "",
      objetivo: nota.objetivo ?? "",
      analisis: nota.analisis ?? "",
      plan: nota.plan ?? "",
      diagnostico: nota.diagnostico ?? "",
      tratamiento: nota.tratamiento ?? "",
      evolucion: nota.evolucion ?? "",
    });
    setShowNotaForm(true);
  };

  const handleSaveNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNota(true);

    if (editingNota) {
      await fetch(`/api/expedientes/${expediente!.id}/notas/${editingNota.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notaForm),
      });
    } else {
      await fetch(`/api/expedientes/${expediente!.id}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notaForm),
      });
    }

    await loadExpediente();
    setShowNotaForm(false);
    setSavingNota(false);
  };

  const handleDeleteNota = async () => {
    if (!deleteNota || !expediente) return;
    setDeletingNota(true);
    await fetch(`/api/expedientes/${expediente.id}/notas/${deleteNota.id}`, { method: "DELETE" });
    await loadExpediente();
    setDeleteNota(null);
    setDeletingNota(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loadingPaciente) {
    return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!paciente) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <UserCircle size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Paciente no encontrado</p>
          <button onClick={() => router.push("/dashboard/pacientes")} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800">
            ← Volver a pacientes
          </button>
        </div>
      </div>
    );
  }

  const initials = `${paciente.nombre[0] ?? ""}${paciente.apellidos[0] ?? ""}`;
  const edad = paciente.fechaNacimiento
    ? Math.floor((Date.now() - new Date(paciente.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/pacientes")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Pacientes
        </button>
        <button onClick={() => openEdit(paciente)} className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50">
          <Pencil size={14} /> Editar paciente
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{paciente.nombre} {paciente.apellidos}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-500">{paciente.sexo}</span>
                {edad !== null && <><span className="text-slate-300">·</span><span className="text-sm text-slate-500">{edad} años</span></>}
              </div>
            </div>
          </div>

          {/* Info sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 px-5 py-2 divide-y divide-slate-100">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">Contacto</h2>
              <Field icon={Calendar} label="Fecha de nacimiento" value={paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento).toLocaleDateString("es-MX") : undefined} />
              <Field icon={Phone} label="Teléfono" value={paciente.telefono} />
              <Field icon={Mail} label="Correo electrónico" value={paciente.email} />
              <Field icon={MapPin} label="Dirección" value={paciente.direccion} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 px-5 py-2 divide-y divide-slate-100">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">Información médica</h2>
              <Field icon={AlertTriangle} label="Alergias" value={paciente.alergias} />
              <Field icon={FileText} label="Antecedentes médicos" value={paciente.antecedentes} />
            </div>
          </div>

          {(paciente.contactoEmergencia || paciente.telefonoEmergencia) && (
            <div className="bg-amber-50 rounded-2xl ring-1 ring-amber-200 px-5 py-2">
              <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider py-3 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Contacto de emergencia
              </h2>
              <div className="divide-y divide-amber-100">
                <Field icon={UserCircle} label="Nombre" value={paciente.contactoEmergencia} />
                <Field icon={PhoneCall} label="Teléfono" value={paciente.telefonoEmergencia} />
              </div>
            </div>
          )}

          {/* ── Expediente clínico ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={17} className="text-slate-400" />
                <h2 className="font-semibold text-slate-900">Expediente clínico</h2>
              </div>
              {expediente && (
                <button onClick={openNewNota} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                  <Plus size={14} /> Nueva nota
                </button>
              )}
            </div>

            {loadingExp ? (
              <div className="p-6 flex justify-center">
                <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !expediente ? (
              <div className="p-8 text-center">
                <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Sin expediente clínico</p>
                <p className="text-sm text-slate-400 mt-1">Crea el expediente para empezar a registrar notas SOAP</p>
                <button
                  onClick={handleCreateExpediente}
                  disabled={creatingExp}
                  className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                  {creatingExp ? "Creando…" : "Crear expediente"}
                </button>
              </div>
            ) : expediente.notas.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay notas en el expediente</p>
                <button onClick={openNewNota} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                  Agregar primera nota →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expediente.notas.map((nota) => {
                  const isOpen = expandedNota === nota.id;
                  const filledFields = SOAP_FIELDS.filter((f) => nota[f.key]);
                  return (
                    <div key={nota.id} className="px-6 py-4">
                      {/* Nota header */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setExpandedNota(isOpen ? null : nota.id)}
                          className="flex items-center gap-2 text-left flex-1"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {nota.diagnostico || nota.subjetivo || "Nota clínica"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Dr. {nota.creadoPor.nombre} {nota.creadoPor.apellidos} ·{" "}
                              {new Date(nota.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                              {" · "}{filledFields.length} campo{filledFields.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {isOpen ? <ChevronUp size={15} className="text-slate-400 ml-2 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 ml-2 shrink-0" />}
                        </button>
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          <button onClick={() => openEditNota(nota)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteNota(nota)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isOpen && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SOAP_FIELDS.map((f) => {
                            const val = nota[f.key];
                            if (!val) return null;
                            return (
                              <div key={f.key} className={`${f.color} rounded-xl p-3`}>
                                <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-1">{f.label}</p>
                                <p className="text-sm whitespace-pre-wrap">{val}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit patient modal ─────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Editar paciente</h2>
              <button onClick={() => setShowEdit(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input required value={editForm.nombre ?? ""} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                  <input required value={editForm.apellidos ?? ""} onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={editForm.fechaNacimiento ?? ""} onChange={(e) => setEditForm({ ...editForm, fechaNacimiento: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sexo</label>
                  <select value={editForm.sexo ?? ""} onChange={(e) => setEditForm({ ...editForm, sexo: e.target.value })} className={inputClass}>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input value={editForm.telefono ?? ""} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
                <input value={editForm.direccion ?? ""} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Alergias</label>
                <textarea value={editForm.alergias ?? ""} onChange={(e) => setEditForm({ ...editForm, alergias: e.target.value })} rows={2} className={textareaClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Antecedentes médicos</label>
                <textarea value={editForm.antecedentes ?? ""} onChange={(e) => setEditForm({ ...editForm, antecedentes: e.target.value })} rows={2} className={textareaClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contacto de emergencia</label>
                  <input value={editForm.contactoEmergencia ?? ""} onChange={(e) => setEditForm({ ...editForm, contactoEmergencia: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono emergencia</label>
                  <input value={editForm.telefonoEmergencia ?? ""} onChange={(e) => setEditForm({ ...editForm, telefonoEmergencia: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Nota SOAP modal ────────────────────────────────────────────────── */}
      {showNotaForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">{editingNota ? "Editar nota SOAP" : "Nueva nota SOAP"}</h2>
              <button onClick={() => setShowNotaForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveNota} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SOAP_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "evolucion" ? "sm:col-span-2" : ""}>
                    <label className={`block text-xs font-bold mb-1 ${f.color} px-2 py-0.5 rounded-md w-fit`}>{f.label}</label>
                    <textarea
                      value={(notaForm as any)[f.key] ?? ""}
                      onChange={(e) => setNotaForm({ ...notaForm, [f.key]: e.target.value })}
                      rows={3}
                      className={textareaClass}
                      placeholder={`${f.label}…`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingNota} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingNota ? "Guardando…" : editingNota ? "Guardar cambios" : "Agregar nota"}
                </button>
                <button type="button" onClick={() => setShowNotaForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete nota confirm ────────────────────────────────────────────── */}
      {deleteNota && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar nota</h2>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteNota} disabled={deletingNota} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deletingNota ? "Eliminando…" : "Eliminar"}
              </button>
              <button onClick={() => setDeleteNota(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
