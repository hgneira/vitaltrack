"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Search, Users, CalendarDays, GraduationCap, Phone, Mail, ArrowRight, BadgeCheck } from "lucide-react";

interface Medico {
  id: string;
  nombre: string;
  apellidos?: string;
  titulo?: string;
  email: string;
  especialidad?: string;
  subespecialidad?: string;
  telefono?: string;
  escuela?: string;
  cedulaProfesional?: string;
  foto?: string;
  activo: boolean;
  _count: { citas: number };
  pacientesCount: number;
}

const ESPECIALIDAD_COLOR: Record<string, string> = {
  "Medicina Interna": "bg-blue-100 text-blue-700",
  "Cardiología":      "bg-red-100 text-red-700",
  "Pediatría":        "bg-emerald-100 text-emerald-700",
  "Ortopedia":        "bg-amber-100 text-amber-700",
  "Neurología":       "bg-violet-100 text-violet-700",
};

function especialidadColor(esp?: string) {
  return esp ? (ESPECIALIDAD_COLOR[esp] ?? "bg-slate-100 text-slate-600") : "bg-slate-100 text-slate-600";
}

const AVATAR_COLORS = [
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-emerald-500",
];

export default function MedicosPage() {
  const router = useRouter();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    fetch("/api/admin/medicos")
      .then((r) => r.json())
      .then((d) => { setMedicos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = medicos.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.nombre.toLowerCase().includes(q) ||
      (m.apellidos ?? "").toLowerCase().includes(q) ||
      (m.especialidad ?? "").toLowerCase().includes(q) ||
      (m.escuela ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Directorio Médico</h1>
          {!loading && (
            <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {medicos.length}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, especialidad o escuela…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Stethoscope size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No se encontraron médicos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => router.push(`/dashboard/admin/medicos/${m.id}`)}
                className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 hover:ring-cyan-300 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm overflow-hidden`}>
                    {m.foto
                      ? <img src={m.foto} alt={m.nombre} className="w-full h-full object-cover" />
                      : <>{m.nombre[0]}{m.apellidos?.[0] ?? ""}</>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {m.titulo ? `${m.titulo} ` : ""}{m.nombre} {m.apellidos ?? ""}
                      </h2>
                      {!m.activo && (
                        <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">Inactivo</span>
                      )}
                    </div>
                    {m.especialidad && (
                      <span className={`mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${especialidadColor(m.especialidad)}`}>
                        {m.especialidad}
                      </span>
                    )}
                    {m.subespecialidad && (
                      <span className="mt-1 ml-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {m.subespecialidad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-2 mb-4">
                  {m.escuela && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <GraduationCap size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-snug">{m.escuela}</span>
                    </div>
                  )}
                  {m.cedulaProfesional && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <BadgeCheck size={13} className="text-slate-400 shrink-0" />
                      <span>{m.cedulaProfesional}</span>
                    </div>
                  )}
                  {m.telefono && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{m.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Users size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">{m.pacientesCount}</span> paciente{m.pacientesCount !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarDays size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">{m._count.citas}</span> cita{m._count.citas !== 1 ? "s" : ""}
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={15} className="text-cyan-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
