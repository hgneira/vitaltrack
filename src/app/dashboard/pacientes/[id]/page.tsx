"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  UserCircle, Phone, Mail, MapPin, AlertTriangle, FileText,
  PhoneCall, ArrowLeft, Calendar, Pencil, X, Plus, Trash2,
  ChevronDown, ChevronUp, ClipboardList, Activity, Pill,
  Stethoscope, Monitor, ShieldCheck, Shield,
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
  curp?: string;
  numeroExpediente?: string;
  consentimiento?: { aceptado: boolean; fechaAceptacion?: string; firmanteTipo?: string; firmanteNombre?: string };
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

interface SignosVitales {
  id: string;
  turno: string;
  fecha: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  spo2?: number;
  peso?: number;
  talla?: number;
  glucosa?: number;
  registradoPor: { nombre: string; apellidos?: string };
}

interface MedicamentoAdm {
  id: string;
  medicamento: string;
  dosis?: string;
  via?: string;
  frecuencia?: string;
  indicadoPorNombre?: string;
  fecha: string;
  indicadoPor?: { nombre: string; apellidos?: string };
}

interface Interconsulta {
  id: string;
  especialidad: string;
  motivo?: string;
  respuesta?: string;
  fecha: string;
  solicitadoPor?: { nombre: string; apellidos?: string };
}

interface DispositivoUsado {
  id: string;
  inicio: string;
  fin?: string;
  notas?: string;
  equipo: { nombre: string; modelo?: string; ubicacion?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const textareaClass = `${inputClass} resize-none`;

const SOAP_FIELDS: { key: keyof Omit<NotaSOAP, "id" | "createdAt" | "creadoPor">; label: string; color: string }[] = [
  { key: "subjetivo",   label: "S — Subjetivo",    color: "text-violet-700 bg-violet-50" },
  { key: "objetivo",    label: "O — Objetivo",      color: "text-blue-700 bg-blue-50" },
  { key: "analisis",    label: "A — Análisis",      color: "text-amber-700 bg-amber-50" },
  { key: "plan",        label: "P — Plan",           color: "text-emerald-700 bg-emerald-50" },
  { key: "diagnostico", label: "Diagnóstico",        color: "text-red-700 bg-red-50" },
  { key: "tratamiento", label: "Tratamiento",        color: "text-cyan-700 bg-cyan-50" },
  { key: "evolucion",   label: "Evolución",          color: "text-slate-700 bg-slate-50" },
];

const emptyNota = { subjetivo: "", objetivo: "", analisis: "", plan: "", diagnostico: "", tratamiento: "", evolucion: "" };
const TURNOS = ["MATUTINO", "VESPERTINO", "NOCTURNO"];
const TURNO_COLOR: Record<string, string> = {
  MATUTINO: "bg-amber-100 text-amber-700",
  VESPERTINO: "bg-orange-100 text-orange-700",
  NOCTURNO: "bg-indigo-100 text-indigo-700",
};

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

type Tab = "notas" | "signos" | "medicamentos" | "interconsultas" | "dispositivos";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DetallePacientePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pacienteId = params.id as string;

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loadingPaciente, setLoadingPaciente] = useState(true);
  const [loadingExp, setLoadingExp] = useState(true);

  // New data
  const [signos, setSignos] = useState<SignosVitales[]>([]);
  const [medicamentos, setMedicamentos] = useState<MedicamentoAdm[]>([]);
  const [interconsultas, setInterconsultas] = useState<Interconsulta[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoUsado[]>([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState<{ id: string; nombre: string; ubicacion?: string }[]>([]);

  const [tab, setTab] = useState<Tab>("notas");

  // Edit patient modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Paciente & { curp: string }>>({});
  const [saving, setSaving] = useState(false);

  // Nota SOAP
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaSOAP | null>(null);
  const [notaForm, setNotaForm] = useState(emptyNota);
  const [savingNota, setSavingNota] = useState(false);
  const [deleteNota, setDeleteNota] = useState<NotaSOAP | null>(null);
  const [deletingNota, setDeletingNota] = useState(false);
  const [expandedNota, setExpandedNota] = useState<string | null>(null);
  const [creatingExp, setCreatingExp] = useState(false);

  // Signos vitales form
  const [showSignosForm, setShowSignosForm] = useState(false);
  const [signosForm, setSignosForm] = useState<any>({ turno: "MATUTINO" });
  const [savingSignos, setSavingSignos] = useState(false);

  // Medicamento form
  const [showMedForm, setShowMedForm] = useState(false);
  const [medForm, setMedForm] = useState<any>({});
  const [savingMed, setSavingMed] = useState(false);

  // Interconsulta form
  const [showInterForm, setShowInterForm] = useState(false);
  const [interForm, setInterForm] = useState<any>({});
  const [savingInter, setSavingInter] = useState(false);
  const [editingInter, setEditingInter] = useState<Interconsulta | null>(null);

  // Dispositivo form
  const [showDispForm, setShowDispForm] = useState(false);
  const [dispForm, setDispForm] = useState<any>({});
  const [savingDisp, setSavingDisp] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadPaciente = () =>
    fetch(`/api/pacientes/${pacienteId}`)
      .then((r) => r.json())
      .then((d) => { setPaciente(d?.id ? d : null); setLoadingPaciente(false); });

  const loadExpediente = () =>
    fetch(`/api/expedientes?pacienteId=${pacienteId}`)
      .then((r) => r.json())
      .then((d) => { setExpediente(d?.id ? d : null); setLoadingExp(false); });

  const loadSignos = (expId: string) =>
    fetch(`/api/expedientes/${expId}/signos`).then((r) => r.json()).then(setSignos).catch(() => {});

  const loadMedicamentos = (expId: string) =>
    fetch(`/api/expedientes/${expId}/medicamentos`).then((r) => r.json()).then(setMedicamentos).catch(() => {});

  const loadInterconsultas = (expId: string) =>
    fetch(`/api/expedientes/${expId}/interconsultas`).then((r) => r.json()).then(setInterconsultas).catch(() => {});

  const loadDispositivos = (expId: string) =>
    fetch(`/api/expedientes/${expId}/dispositivos`).then((r) => r.json()).then(setDispositivos).catch(() => {});

  useEffect(() => {
    loadPaciente();
    loadExpediente();
    fetch("/api/equipos").then((r) => r.json()).then((d) => setEquiposDisponibles(Array.isArray(d) ? d : [])).catch(() => {});
  }, [pacienteId]);

  useEffect(() => {
    if (expediente?.id) {
      loadSignos(expediente.id);
      loadMedicamentos(expediente.id);
      loadInterconsultas(expediente.id);
      loadDispositivos(expediente.id);
    }
  }, [expediente?.id]);

  useEffect(() => {
    if (paciente && searchParams.get("edit") === "1") {
      openEdit(paciente);
      router.replace(`/dashboard/pacientes/${pacienteId}`);
    }
  }, [paciente, searchParams]);

  // ── Edit patient ──────────────────────────────────────────────────────────────

  const openEdit = (p: Paciente) => {
    setEditForm({
      nombre: p.nombre, apellidos: p.apellidos,
      fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.slice(0, 10) : "",
      sexo: p.sexo, telefono: p.telefono ?? "", email: p.email ?? "",
      direccion: p.direccion ?? "", alergias: p.alergias ?? "",
      antecedentes: p.antecedentes ?? "", contactoEmergencia: p.contactoEmergencia ?? "",
      telefonoEmergencia: p.telefonoEmergencia ?? "", curp: p.curp ?? "",
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/pacientes/${pacienteId}`, {
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
      body: JSON.stringify({ pacienteId }),
    });
    await loadExpediente();
    setCreatingExp(false);
  };

  // ── Notas SOAP ────────────────────────────────────────────────────────────────

  const openNewNota = () => { setEditingNota(null); setNotaForm(emptyNota); setShowNotaForm(true); };
  const openEditNota = (nota: NotaSOAP) => {
    setEditingNota(nota);
    setNotaForm({ subjetivo: nota.subjetivo ?? "", objetivo: nota.objetivo ?? "", analisis: nota.analisis ?? "",
      plan: nota.plan ?? "", diagnostico: nota.diagnostico ?? "", tratamiento: nota.tratamiento ?? "", evolucion: nota.evolucion ?? "" });
    setShowNotaForm(true);
  };

  const handleSaveNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNota(true);
    if (editingNota) {
      await fetch(`/api/expedientes/${expediente!.id}/notas/${editingNota.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notaForm),
      });
    } else {
      await fetch(`/api/expedientes/${expediente!.id}/notas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notaForm),
      });
    }
    await loadExpediente();
    setShowNotaForm(false); setSavingNota(false);
  };

  const handleDeleteNota = async () => {
    if (!deleteNota || !expediente) return;
    setDeletingNota(true);
    await fetch(`/api/expedientes/${expediente.id}/notas/${deleteNota.id}`, { method: "DELETE" });
    await loadExpediente();
    setDeleteNota(null); setDeletingNota(false);
  };

  // ── Signos vitales ────────────────────────────────────────────────────────────

  const handleSaveSignos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSignos(true);
    await fetch(`/api/expedientes/${expediente!.id}/signos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signosForm),
    });
    await loadSignos(expediente!.id);
    setShowSignosForm(false); setSavingSignos(false); setSignosForm({ turno: "MATUTINO" });
  };

  // ── Medicamentos ──────────────────────────────────────────────────────────────

  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMed(true);
    await fetch(`/api/expedientes/${expediente!.id}/medicamentos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(medForm),
    });
    await loadMedicamentos(expediente!.id);
    setShowMedForm(false); setSavingMed(false); setMedForm({});
  };

  // ── Interconsultas ────────────────────────────────────────────────────────────

  const handleSaveInter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInter(true);
    if (editingInter) {
      await fetch(`/api/expedientes/${expediente!.id}/interconsultas`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interconsultaId: editingInter.id, respuesta: interForm.respuesta }),
      });
    } else {
      await fetch(`/api/expedientes/${expediente!.id}/interconsultas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interForm),
      });
    }
    await loadInterconsultas(expediente!.id);
    setShowInterForm(false); setSavingInter(false); setInterForm({}); setEditingInter(null);
  };

  // ── Dispositivos ──────────────────────────────────────────────────────────────

  const handleSaveDisp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDisp(true);
    await fetch(`/api/expedientes/${expediente!.id}/dispositivos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dispForm),
    });
    await loadDispositivos(expediente!.id);
    setShowDispForm(false); setSavingDisp(false); setDispForm({});
  };

  const handleEndDisp = async (dispId: string) => {
    await fetch(`/api/expedientes/${expediente!.id}/dispositivos`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispositivoId: dispId }),
    });
    await loadDispositivos(expediente!.id);
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
          <button onClick={() => router.push("/dashboard/pacientes")} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800">← Volver</button>
        </div>
      </div>
    );
  }

  const initials = `${paciente.nombre[0] ?? ""}${paciente.apellidos[0] ?? ""}`;
  const edad = paciente.fechaNacimiento
    ? Math.floor((Date.now() - new Date(paciente.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "notas", label: "Notas SOAP", icon: FileText },
    { id: "signos", label: "Signos Vitales", icon: Activity },
    { id: "medicamentos", label: "Medicamentos", icon: Pill },
    { id: "interconsultas", label: "Interconsultas", icon: Stethoscope },
    { id: "dispositivos", label: "Dispositivos", icon: Monitor },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/pacientes")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Pacientes
        </button>
        <button onClick={() => openEdit(paciente)} className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50">
          <Pencil size={14} /> Editar
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{paciente.nombre} {paciente.apellidos}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500">{paciente.sexo}</span>
                      {edad !== null && <><span className="text-slate-300">·</span><span className="text-sm text-slate-500">{edad} años</span></>}
                      {paciente.numeroExpediente && (
                        <><span className="text-slate-300">·</span>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{paciente.numeroExpediente}</span></>
                      )}
                    </div>
                  </div>
                  {paciente.consentimiento?.aceptado ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg ring-1 ring-emerald-200 shrink-0">
                      <ShieldCheck size={13} />
                      Consentimiento aceptado
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg ring-1 ring-amber-200 shrink-0">
                      <Shield size={13} />
                      Sin consentimiento
                    </div>
                  )}
                </div>
                {paciente.curp && (
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="font-medium text-slate-400 uppercase tracking-wide mr-1">CURP:</span>
                    <span className="font-mono">{paciente.curp}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 px-5 py-2 divide-y divide-slate-100">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">Contacto</h2>
              <Field icon={Calendar} label="Fecha de nacimiento" value={paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento).toLocaleDateString("es-MX") : undefined} />
              <Field icon={Phone} label="Teléfono" value={paciente.telefono} />
              <Field icon={Mail} label="Correo" value={paciente.email} />
              <Field icon={MapPin} label="Dirección" value={paciente.direccion} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 px-5 py-2 divide-y divide-slate-100">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">Información médica</h2>
              <Field icon={AlertTriangle} label="Alergias" value={paciente.alergias} />
              <Field icon={FileText} label="Antecedentes" value={paciente.antecedentes} />
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

          {/* Expediente — tabbed */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={17} className="text-slate-400" />
                <h2 className="font-semibold text-slate-900">Expediente clínico</h2>
              </div>
              {expediente && (
                <div className="flex items-center gap-2">
                  {tab === "notas" && (
                    <button onClick={openNewNota} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                      <Plus size={14} /> Nota
                    </button>
                  )}
                  {tab === "signos" && (
                    <button onClick={() => setShowSignosForm(true)} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                      <Plus size={14} /> Registrar
                    </button>
                  )}
                  {tab === "medicamentos" && (
                    <button onClick={() => setShowMedForm(true)} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                      <Plus size={14} /> Agregar
                    </button>
                  )}
                  {tab === "interconsultas" && (
                    <button onClick={() => { setEditingInter(null); setInterForm({}); setShowInterForm(true); }} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                      <Plus size={14} /> Solicitar
                    </button>
                  )}
                  {tab === "dispositivos" && (
                    <button onClick={() => setShowDispForm(true)} className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                      <Plus size={14} /> Vincular
                    </button>
                  )}
                </div>
              )}
            </div>

            {loadingExp ? (
              <div className="p-6 flex justify-center"><div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : !expediente ? (
              <div className="p-8 text-center">
                <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Sin expediente clínico</p>
                <p className="text-sm text-slate-400 mt-1">Crea el expediente para comenzar a registrar información clínica</p>
                <button onClick={handleCreateExpediente} disabled={creatingExp}
                  className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50">
                  {creatingExp ? "Creando…" : "Crear expediente"}
                </button>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-0 border-b border-slate-100 overflow-x-auto">
                  {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                        tab === t.id ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}>
                      <t.icon size={13} /> {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-0">

                  {/* SOAP notes */}
                  {tab === "notas" && (
                    expediente.notas.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">No hay notas SOAP</p>
                        <button onClick={openNewNota} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800 font-medium">Agregar primera nota →</button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {expediente.notas.map((nota) => {
                          const isOpen = expandedNota === nota.id;
                          const filledFields = SOAP_FIELDS.filter((f) => nota[f.key]);
                          return (
                            <div key={nota.id} className="px-6 py-4">
                              <div className="flex items-center justify-between">
                                <button onClick={() => setExpandedNota(isOpen ? null : nota.id)} className="flex items-center gap-2 text-left flex-1">
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{nota.diagnostico || nota.subjetivo || "Nota clínica"}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Dr. {nota.creadoPor.nombre} {nota.creadoPor.apellidos} ·{" "}
                                      {new Date(nota.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                                      {" · "}{filledFields.length} campo{filledFields.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  {isOpen ? <ChevronUp size={15} className="text-slate-400 ml-2 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 ml-2 shrink-0" />}
                                </button>
                                <div className="flex items-center gap-1 ml-3 shrink-0">
                                  <button onClick={() => openEditNota(nota)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Pencil size={14} /></button>
                                  <button onClick={() => setDeleteNota(nota)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                </div>
                              </div>
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
                    )
                  )}

                  {/* Signos vitales */}
                  {tab === "signos" && (
                    signos.length === 0 ? (
                      <div className="p-8 text-center">
                        <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">Sin signos vitales registrados</p>
                        <button onClick={() => setShowSignosForm(true)} className="mt-3 text-sm text-cyan-600 hover:text-cyan-800 font-medium">Registrar primero →</button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Turno / Fecha</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">T°</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">FC</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">FR</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">PA</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">SpO₂</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Glucosa</th>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Peso/Talla</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Registró</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {signos.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TURNO_COLOR[s.turno]}`}>{s.turno}</span>
                                  <p className="text-xs text-slate-400 mt-1">{new Date(s.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</p>
                                </td>
                                <td className="px-3 py-3 text-center text-slate-700">{s.temperatura ? `${s.temperatura}°C` : "—"}</td>
                                <td className="px-3 py-3 text-center text-slate-700">{s.frecuenciaCardiaca ?? "—"}</td>
                                <td className="px-3 py-3 text-center text-slate-700">{s.frecuenciaRespiratoria ?? "—"}</td>
                                <td className="px-3 py-3 text-center text-slate-700">
                                  {s.presionSistolica && s.presionDiastolica ? `${s.presionSistolica}/${s.presionDiastolica}` : "—"}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {s.spo2 ? (
                                    <span className={`font-medium ${s.spo2 >= 95 ? "text-emerald-600" : s.spo2 >= 90 ? "text-amber-600" : "text-red-600"}`}>
                                      {s.spo2}%
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-3 text-center text-slate-700">{s.glucosa ? `${s.glucosa} mg/dL` : "—"}</td>
                                <td className="px-3 py-3 text-center text-slate-700 text-xs">
                                  {s.peso ? `${s.peso} kg` : "—"} {s.talla ? `/ ${s.talla} cm` : ""}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">{s.registradoPor.nombre}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {/* Medicamentos */}
                  {tab === "medicamentos" && (
                    medicamentos.length === 0 ? (
                      <div className="p-8 text-center">
                        <Pill size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">Sin medicamentos registrados</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {medicamentos.map((m) => (
                          <div key={m.id} className="px-6 py-4 flex items-start gap-4">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                              <Pill size={15} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm">{m.medicamento}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                {m.dosis && <span className="text-xs text-slate-500">Dosis: <strong>{m.dosis}</strong></span>}
                                {m.via && <span className="text-xs text-slate-500">Vía: <strong>{m.via}</strong></span>}
                                {m.frecuencia && <span className="text-xs text-slate-500">Frecuencia: <strong>{m.frecuencia}</strong></span>}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                Indicado por: {m.indicadoPorNombre || `${m.indicadoPor?.nombre} ${m.indicadoPor?.apellidos ?? ""}`}
                                {" · "}{new Date(m.fecha).toLocaleDateString("es-MX")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Interconsultas */}
                  {tab === "interconsultas" && (
                    interconsultas.length === 0 ? (
                      <div className="p-8 text-center">
                        <Stethoscope size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">Sin interconsultas</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {interconsultas.map((ic) => (
                          <div key={ic.id} className="px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="inline-block text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mb-1">{ic.especialidad}</span>
                                {ic.motivo && <p className="text-sm text-slate-700">{ic.motivo}</p>}
                                <p className="text-xs text-slate-400 mt-1">{new Date(ic.fecha).toLocaleDateString("es-MX")}</p>
                              </div>
                              {!ic.respuesta && (
                                <button
                                  onClick={() => { setEditingInter(ic); setInterForm({ respuesta: "" }); setShowInterForm(true); }}
                                  className="text-xs text-cyan-600 hover:text-cyan-800 font-medium shrink-0"
                                >
                                  Agregar respuesta
                                </button>
                              )}
                            </div>
                            {ic.respuesta && (
                              <div className="mt-3 bg-emerald-50 rounded-xl p-3">
                                <p className="text-xs font-semibold text-emerald-600 mb-1">Respuesta</p>
                                <p className="text-sm text-emerald-800">{ic.respuesta}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Dispositivos */}
                  {tab === "dispositivos" && (
                    dispositivos.length === 0 ? (
                      <div className="p-8 text-center">
                        <Monitor size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">Sin dispositivos vinculados</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {dispositivos.map((d) => (
                          <div key={d.id} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                              <Monitor size={15} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm">{d.equipo.nombre}</p>
                              {d.equipo.modelo && <p className="text-xs text-slate-500">{d.equipo.modelo}</p>}
                              <p className="text-xs text-slate-400 mt-0.5">
                                Inicio: {new Date(d.inicio).toLocaleDateString("es-MX")}
                                {d.fin ? ` · Fin: ${new Date(d.fin).toLocaleDateString("es-MX")}` : " · En uso"}
                              </p>
                              {d.notas && <p className="text-xs text-slate-500 mt-0.5">{d.notas}</p>}
                            </div>
                            {!d.fin && (
                              <button
                                onClick={() => handleEndDisp(d.id)}
                                className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 shrink-0"
                              >
                                Finalizar uso
                              </button>
                            )}
                            {d.fin && <span className="text-xs text-slate-400 shrink-0">Completado</span>}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </>
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
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input required value={editForm.nombre ?? ""} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                  <input required value={editForm.apellidos ?? ""} onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={editForm.fechaNacimiento ?? ""} onChange={(e) => setEditForm({ ...editForm, fechaNacimiento: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Sexo</label>
                  <select value={editForm.sexo ?? ""} onChange={(e) => setEditForm({ ...editForm, sexo: e.target.value })} className={inputClass}>
                    <option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option>
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input value={editForm.telefono ?? ""} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-700 mb-1">CURP <span className="text-slate-400 font-normal">(se cifrará)</span></label>
                  <input value={editForm.curp ?? ""} onChange={(e) => setEditForm({ ...editForm, curp: e.target.value })} className={inputClass} maxLength={18} style={{ textTransform: "uppercase" }} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
                <input value={editForm.direccion ?? ""} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Alergias</label>
                <textarea value={editForm.alergias ?? ""} onChange={(e) => setEditForm({ ...editForm, alergias: e.target.value })} rows={2} className={textareaClass} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Antecedentes</label>
                <textarea value={editForm.antecedentes ?? ""} onChange={(e) => setEditForm({ ...editForm, antecedentes: e.target.value })} rows={2} className={textareaClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Contacto emergencia</label>
                  <input value={editForm.contactoEmergencia ?? ""} onChange={(e) => setEditForm({ ...editForm, contactoEmergencia: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Tel. emergencia</label>
                  <input value={editForm.telefonoEmergencia ?? ""} onChange={(e) => setEditForm({ ...editForm, telefonoEmergencia: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
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
                    <textarea value={(notaForm as any)[f.key] ?? ""} onChange={(e) => setNotaForm({ ...notaForm, [f.key]: e.target.value })} rows={3} className={textareaClass} placeholder={`${f.label}…`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingNota} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingNota ? "Guardando…" : editingNota ? "Guardar cambios" : "Agregar nota"}
                </button>
                <button type="button" onClick={() => setShowNotaForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Signos vitales modal ──────────────────────────────────────────── */}
      {showSignosForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Registrar signos vitales</h2>
              <button onClick={() => setShowSignosForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveSignos} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Turno</label>
                <div className="flex gap-2">
                  {TURNOS.map((t) => (
                    <button key={t} type="button" onClick={() => setSignosForm({ ...signosForm, turno: t })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${signosForm.turno === t ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "temperatura", label: "Temperatura (°C)", step: "0.1" },
                  { key: "frecuenciaCardiaca", label: "FC (lpm)" },
                  { key: "frecuenciaRespiratoria", label: "FR (rpm)" },
                  { key: "presionSistolica", label: "PA Sistólica (mmHg)" },
                  { key: "presionDiastolica", label: "PA Diastólica (mmHg)" },
                  { key: "spo2", label: "SpO₂ (%)", step: "0.1" },
                  { key: "peso", label: "Peso (kg)", step: "0.1" },
                  { key: "talla", label: "Talla (cm)", step: "0.1" },
                  { key: "glucosa", label: "Glucosa (mg/dL)", step: "0.1" },
                ].map(({ key, label, step }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
                    <input type="number" step={step ?? "1"} value={signosForm[key] ?? ""} onChange={(e) => setSignosForm({ ...signosForm, [key]: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} placeholder="—" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingSignos} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingSignos ? "Guardando…" : "Guardar signos"}
                </button>
                <button type="button" onClick={() => setShowSignosForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Medicamento modal ─────────────────────────────────────────────── */}
      {showMedForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Agregar medicamento</h2>
              <button onClick={() => setShowMedForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveMed} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Medicamento *</label>
                <input required value={medForm.medicamento ?? ""} onChange={(e) => setMedForm({ ...medForm, medicamento: e.target.value })} className={inputClass} placeholder="Nombre del medicamento" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dosis</label>
                  <input value={medForm.dosis ?? ""} onChange={(e) => setMedForm({ ...medForm, dosis: e.target.value })} className={inputClass} placeholder="500 mg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vía</label>
                  <input value={medForm.via ?? ""} onChange={(e) => setMedForm({ ...medForm, via: e.target.value })} className={inputClass} placeholder="Oral, IV, IM…" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frecuencia</label>
                  <input value={medForm.frecuencia ?? ""} onChange={(e) => setMedForm({ ...medForm, frecuencia: e.target.value })} className={inputClass} placeholder="Cada 8 horas" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingMed} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingMed ? "Guardando…" : "Agregar"}
                </button>
                <button type="button" onClick={() => setShowMedForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Interconsulta modal ───────────────────────────────────────────── */}
      {showInterForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{editingInter ? "Responder interconsulta" : "Solicitar interconsulta"}</h2>
              <button onClick={() => { setShowInterForm(false); setEditingInter(null); }}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveInter} className="p-6 space-y-3">
              {!editingInter && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Especialidad *</label>
                    <input required value={interForm.especialidad ?? ""} onChange={(e) => setInterForm({ ...interForm, especialidad: e.target.value })} className={inputClass} placeholder="Cardiología, Neurología…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Motivo</label>
                    <textarea value={interForm.motivo ?? ""} onChange={(e) => setInterForm({ ...interForm, motivo: e.target.value })} rows={3} className={textareaClass} placeholder="Describir el motivo de la interconsulta…" />
                  </div>
                </>
              )}
              {editingInter && (
                <div>
                  <p className="text-sm text-slate-600 mb-2"><strong>Especialidad:</strong> {editingInter.especialidad}</p>
                  {editingInter.motivo && <p className="text-sm text-slate-500 mb-3">{editingInter.motivo}</p>}
                  <label className="block text-xs font-medium text-slate-700 mb-1">Respuesta *</label>
                  <textarea required value={interForm.respuesta ?? ""} onChange={(e) => setInterForm({ ...interForm, respuesta: e.target.value })} rows={4} className={textareaClass} placeholder="Respuesta del especialista…" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingInter} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingInter ? "Guardando…" : editingInter ? "Guardar respuesta" : "Solicitar"}
                </button>
                <button type="button" onClick={() => { setShowInterForm(false); setEditingInter(null); }} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dispositivo modal ─────────────────────────────────────────────── */}
      {showDispForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Vincular dispositivo</h2>
              <button onClick={() => setShowDispForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveDisp} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dispositivo *</label>
                <select required value={dispForm.equipoId ?? ""} onChange={(e) => setDispForm({ ...dispForm, equipoId: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar equipo…</option>
                  {equiposDisponibles.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}{eq.ubicacion ? ` — ${eq.ubicacion}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
                <input value={dispForm.notas ?? ""} onChange={(e) => setDispForm({ ...dispForm, notas: e.target.value })} className={inputClass} placeholder="Observaciones…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingDisp || !dispForm.equipoId} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {savingDisp ? "Guardando…" : "Vincular"}
                </button>
                <button type="button" onClick={() => setShowDispForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete nota confirm ──────────────────────────────────────────── */}
      {deleteNota && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={16} className="text-red-600" /></div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar nota</h2>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteNota} disabled={deletingNota} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deletingNota ? "Eliminando…" : "Eliminar"}
              </button>
              <button onClick={() => setDeleteNota(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
