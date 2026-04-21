"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Stethoscope, GraduationCap, Phone, Mail, BadgeCheck,
  Users, CalendarDays, User, CheckCircle, Clock, XCircle,
} from "lucide-react";

interface Medico {
  id: string; nombre: string; apellidos?: string; titulo?: string; email: string;
  especialidad?: string; subespecialidad?: string; telefono?: string; escuela?: string;
  cedulaProfesional?: string; foto?: string; activo: boolean; createdAt: string;
}

interface Paciente {
  id: string; nombre: string; apellidos: string;
  fechaNacimiento: string; sexo: string; telefono?: string;
  alergias?: string; antecedentes?: string;
}

interface Cita {
  id: string; fecha: string; motivo?: string; estado: string; notas?: string;
  paciente: { id: string; nombre: string; apellidos: string };
}

const ESTADO_CITA: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PROGRAMADA: { label: "Programada", color: "bg-blue-100 text-blue-700",     icon: Clock },
  COMPLETADA: { label: "Completada", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  CANCELADA:  { label: "Cancelada",  color: "bg-red-100 text-red-600",        icon: XCircle },
};

const ESPECIALIDAD_COLOR: Record<string, string> = {
  "Medicina Interna": "bg-blue-100 text-blue-700",
  "Cardiología":      "bg-red-100 text-red-700",
  "Pediatría":        "bg-emerald-100 text-emerald-700",
  "Ortopedia":        "bg-amber-100 text-amber-700",
  "Neurología":       "bg-violet-100 text-violet-700",
};

function calcAge(dob: string) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

type Tab = "pacientes" | "citas";

export default function MedicoDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data,    setData]    = useState<{ medico: Medico; pacientes: Paciente[]; citas: Cita[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>("pacientes");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    fetch(`/api/admin/medicos/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d?.medico ? d : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-500">Médico no encontrado</p>
    </div>
  );

  const { medico: m, pacientes, citas } = data;
  const espColor = m.especialidad ? (ESPECIALIDAD_COLOR[m.especialidad] ?? "bg-slate-100 text-slate-600") : "bg-slate-100 text-slate-600";

  const citasPendientes  = citas.filter((c) => c.estado === "PROGRAMADA").length;
  const citasCompletadas = citas.filter((c) => c.estado === "COMPLETADA").length;

  const filteredPacientes = pacientes.filter((p) => {
    const q = search.toLowerCase();
    return `${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) || (p.telefono ?? "").includes(q);
  });

  const filteredCitas = citas.filter((c) => {
    const q = search.toLowerCase();
    return (
      `${c.paciente.nombre} ${c.paciente.apellidos}`.toLowerCase().includes(q) ||
      (c.motivo ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push("/dashboard/admin/medicos")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Directorio Médico
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-cyan-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm overflow-hidden">
                {m.foto
                  ? <img src={m.foto} alt={m.nombre} className="w-full h-full object-cover" />
                  : <>{m.nombre[0]}{m.apellidos?.[0] ?? ""}</>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">
                    {m.titulo ? `${m.titulo} ` : ""}{m.nombre} {m.apellidos ?? ""}
                  </h1>
                  {m.especialidad && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${espColor}`}>
                      {m.especialidad}
                    </span>
                  )}
                  {m.subespecialidad && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      {m.subespecialidad}
                    </span>
                  )}
                  {!m.activo && (
                    <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">Inactivo</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                  {m.escuela && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 col-span-2">
                      <GraduationCap size={15} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{m.escuela}</span>
                    </div>
                  )}
                  {m.cedulaProfesional && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BadgeCheck size={15} className="text-slate-400 shrink-0" />
                      <span>{m.cedulaProfesional}</span>
                    </div>
                  )}
                  {m.telefono && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-400 shrink-0" />
                      <span>{m.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={15} className="text-slate-400 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Stethoscope size={15} className="text-slate-400 shrink-0" />
                    <span>Registrado el {new Date(m.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 shrink-0">
                <div className="text-center px-4 py-3 bg-slate-50 rounded-xl ring-1 ring-slate-200">
                  <p className="text-2xl font-bold text-slate-900">{pacientes.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pacientes</p>
                </div>
                <div className="text-center px-4 py-3 bg-blue-50 rounded-xl ring-1 ring-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{citasPendientes}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Próximas</p>
                </div>
                <div className="text-center px-4 py-3 bg-emerald-50 rounded-xl ring-1 ring-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700">{citasCompletadas}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Completadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + search */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => { setTab("pacientes"); setSearch(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "pacientes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Users size={14} /> Pacientes
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === "pacientes" ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"}`}>
                  {pacientes.length}
                </span>
              </button>
              <button
                onClick={() => { setTab("citas"); setSearch(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "citas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <CalendarDays size={14} /> Citas
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === "citas" ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"}`}>
                  {citas.length}
                </span>
              </button>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "pacientes" ? "Buscar paciente…" : "Buscar por paciente o motivo…"}
              className="w-56 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* PACIENTES */}
          {tab === "pacientes" && (
            filteredPacientes.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-10 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay pacientes registrados</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Paciente", "Edad", "Sexo", "Teléfono", "Alergias", "Antecedentes"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPacientes.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <User size={14} className="text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{p.nombre} {p.apellidos}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{calcAge(p.fechaNacimiento)} años</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{p.sexo === "M" ? "Masculino" : "Femenino"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{p.telefono || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{p.alergias || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 max-w-xs truncate">{p.antecedentes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* CITAS */}
          {tab === "citas" && (
            filteredCitas.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-10 text-center">
                <CalendarDays size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No hay citas registradas</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Fecha", "Paciente", "Motivo", "Estado"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCitas.map((c) => {
                      const cfg = ESTADO_CITA[c.estado] ?? { label: c.estado, color: "bg-slate-100 text-slate-600", icon: Clock };
                      const Icon = cfg.icon;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                            <p className="font-medium">{new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            <p className="text-xs text-slate-400">{new Date(c.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User size={12} className="text-slate-400" />
                              </div>
                              <span className="text-sm text-slate-900">{c.paciente.nombre} {c.paciente.apellidos}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{c.motivo || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                              <Icon size={11} />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
