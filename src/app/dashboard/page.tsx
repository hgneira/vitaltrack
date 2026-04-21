"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, CalendarDays, CalendarCheck, CalendarClock,
  Plus, ArrowRight, TrendingUp, Clock, Stethoscope,
  SprayCan, Pill, Bell, UserCog, Activity, Wrench, AlertTriangle,
} from "lucide-react";

interface Cita {
  id: string;
  fecha: string;
  motivo?: string;
  estado: string;
  paciente: { nombre: string; apellidos: string };
  medico: { nombre: string; titulo?: string };
}

const estadoBadge: Record<string, { label: string; classes: string }> = {
  PROGRAMADA: { label: "Programada", classes: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" },
  COMPLETADA: { label: "Completada", classes: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  CANCELADA: { label: "Cancelada", classes: "bg-red-100 text-red-600 ring-1 ring-red-200" },
};

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  MEDICO: "Médico",
  ENFERMERIA: "Enfermería",
  INGENIERIA_BIOMEDICA: "Ingeniero Biomédico",
  JEFE_BIOMEDICA: "Jefe de Ing. Biomédica",
  RECEPCION: "Recepción",
  LIMPIEZA: "Limpieza",
  MANTENIMIENTO: "Mantenimiento",
  FARMACIA: "Farmacia",
  URGENCIAS: "Urgencias",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const rol: string = (session?.user as any)?.rol ?? "";

  const [pacientes, setPacientes] = useState<unknown[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [equipos, setEquipos] = useState<{ estado: string; mantenimientos: { proximoMantenimiento?: string }[]; _count: { mantenimientos: number } }[]>([]);
  const [medicamentos, setMedicamentos] = useState<{ stock: number; stockMinimo: number }[]>([]);
  const [alertas, setAlertas] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<void>[] = [];

    if (["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol)) {
      fetches.push(
        fetch("/api/pacientes").then((r) => r.json()).then((d) => setPacientes(Array.isArray(d) ? d : [])),
        fetch("/api/citas").then((r) => r.json()).then((d) => setCitas(Array.isArray(d) ? d : [])),
      );
    }
    if (["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "URGENCIAS"].includes(rol)) {
      fetches.push(fetch("/api/equipos").then((r) => r.json()).then((d) => setEquipos(Array.isArray(d) ? d : [])));
    }
    if (["ADMINISTRADOR", "FARMACIA"].includes(rol)) {
      fetches.push(fetch("/api/medicamentos").then((r) => r.json()).then((d) => setMedicamentos(Array.isArray(d) ? d : [])));
    }
    if (["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol)) {
      fetches.push(fetch("/api/alertas?estado=PENDIENTE").then((r) => r.json()).then((d) => setAlertas(Array.isArray(d) ? d : [])));
    }

    Promise.all(fetches).then(() => setLoading(false));
  }, [rol]);

  const today = new Date().toDateString();
  const citasHoy = citas.filter((c) => new Date(c.fecha).toDateString() === today);
  const citasProgramadas = citas.filter((c) => c.estado === "PROGRAMADA");
  const recentCitas = [...citas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
  const medsBajoStock = medicamentos.filter((m) => m.stock <= m.stockMinimo).length;

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Build stats depending on role
  const stats = [];

  if (["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol)) {
    stats.push(
      { label: "Pacientes registrados", value: pacientes.length, icon: Users, color: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
      { label: "Total de citas", value: citas.length, icon: CalendarDays, color: "bg-cyan-500", bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-100" },
      { label: "Citas programadas", value: citasProgramadas.length, icon: CalendarClock, color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
      { label: "Citas hoy", value: citasHoy.length, icon: CalendarCheck, color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    );
  }
  if (["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(rol)) {
    stats.push({ label: "Equipos médicos", value: equipos.length, icon: Stethoscope, color: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" });
  }
  if (rol === "URGENCIAS") {
    const activos = equipos.filter((e) => e.estado === "ACTIVO").length;
    const fuera = equipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;
    const now = new Date();
    const vencidos = equipos.flatMap((e) => e.mantenimientos).filter((m) => m.proximoMantenimiento && new Date(m.proximoMantenimiento) < now).length;
    stats.push(
      { label: "Total dispositivos",     value: equipos.length, icon: Activity,       color: "bg-red-500",     bg: "bg-red-50",     text: "text-red-600",     ring: "ring-red-100" },
      { label: "Disponibles (activos)",  value: activos,        icon: Activity,       color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
      { label: "Fuera de servicio",      value: fuera,          icon: AlertTriangle,  color: "bg-red-500",     bg: "bg-red-50",     text: "text-red-600",     ring: "ring-red-100" },
      { label: "Mantos. vencidos",       value: vencidos,       icon: Wrench,         color: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-100" },
    );
  }
  if (["ADMINISTRADOR", "FARMACIA"].includes(rol)) {
    stats.push({ label: "Medicamentos (bajo stock)", value: medsBajoStock, icon: Pill, color: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-100" });
  }
  if (["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol)) {
    stats.push({ label: "Alertas pendientes", value: (alertas as unknown[]).length, icon: Bell, color: "bg-red-500", bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" });
  }

  // Quick actions by role
  const actions: { label: string; desc: string; href: string; icon: React.ElementType; color: string }[] = [];
  if (["ADMINISTRADOR"].includes(rol)) {
    actions.push({ label: "Gestionar usuarios", desc: "Crear y administrar cuentas", href: "/dashboard/admin/usuarios", icon: UserCog, color: "bg-violet-50 text-violet-600" });
    actions.push({ label: "Módulo empleados", desc: "Asistencia y pagos", href: "/dashboard/empleados", icon: Users, color: "bg-slate-50 text-slate-600" });
  }
  if (["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol)) {
    actions.push({ label: "Registrar paciente", desc: "Añadir nuevo expediente", href: "/dashboard/pacientes/nuevo", icon: Users, color: "bg-violet-50 text-violet-600" });
    actions.push({ label: "Programar cita", desc: "Agendar nueva consulta", href: "/dashboard/citas/nueva", icon: CalendarDays, color: "bg-cyan-50 text-cyan-600" });
  }
  if (["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(rol)) {
    actions.push({ label: "Equipo médico", desc: "Inventario y mantenimientos", href: "/dashboard/biomedica", icon: Stethoscope, color: "bg-blue-50 text-blue-600" });
  }
  if (rol === "JEFE_BIOMEDICA") {
    actions.push({ label: "Mi Equipo", desc: "Ver tareas del equipo biomédico", href: "/dashboard/biomedica/equipo", icon: Users, color: "bg-indigo-50 text-indigo-600" });
  }
  if (["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol)) {
    actions.push({ label: "Áreas del hospital", desc: "Registrar limpieza/manttto.", href: "/dashboard/limpieza", icon: SprayCan, color: "bg-emerald-50 text-emerald-600" });
    actions.push({ label: "Ver alertas", desc: "Revisar alertas pendientes", href: "/dashboard/alertas", icon: Bell, color: "bg-amber-50 text-amber-600" });
  }
  if (["ADMINISTRADOR", "FARMACIA"].includes(rol)) {
    actions.push({ label: "Inventario farmacia", desc: "Medicamentos y movimientos", href: "/dashboard/farmacia", icon: Pill, color: "bg-orange-50 text-orange-600" });
  }
  if (rol === "URGENCIAS") {
    actions.push(
      { label: "Inventario",       desc: "Ver dispositivos y estado",       href: "/dashboard/urgencias/inventario",    icon: Activity,  color: "bg-red-50 text-red-600" },
      { label: "Mantenimiento",    desc: "Historial y alertas",              href: "/dashboard/urgencias/mantenimiento", icon: Wrench,    color: "bg-amber-50 text-amber-600" },
      { label: "Indicadores KPI",  desc: "Disponibilidad e incidencias",     href: "/dashboard/urgencias/kpis",          icon: Stethoscope, color: "bg-blue-50 text-blue-600" },
      { label: "Reportes",         desc: "Estado por área y alertas",        href: "/dashboard/urgencias/reportes",      icon: Pill,      color: "bg-violet-50 text-violet-600" },
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Bienvenido, {session?.user?.name?.split(" ")[0] ?? "usuario"}
          </h1>
          <p className="text-sm text-slate-500 capitalize">{dateStr} · {ROL_LABELS[rol] ?? rol}</p>
        </div>
        {["MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol) && (
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard/pacientes/nuevo")}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700">
              <Plus size={15} /> Nuevo paciente
            </button>
            <button onClick={() => router.push("/dashboard/citas/nueva")}
              className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700">
              <Plus size={15} /> Nueva cita
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-8">
        {/* Stats */}
        {stats.length > 0 && (
          <div className={`grid gap-5 ${stats.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : `grid-cols-${Math.min(stats.length, 3)}`}`}>
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {loading ? <span className="text-slate-300">…</span> : s.value}
                      </p>
                    </div>
                    <div className={`${s.bg} ring-1 ${s.ring} p-2.5 rounded-xl`}>
                      <Icon size={20} className={s.text} />
                    </div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${s.text}`}>
                    <TrendingUp size={12} />
                    <span>Actualizado ahora</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent citas — solo roles médicos */}
          {["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol) && (
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={17} className="text-slate-500" />
                  <h2 className="font-semibold text-slate-900">Citas recientes</h2>
                </div>
                <button onClick={() => router.push("/dashboard/citas")} className="text-sm text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1">
                  Ver todas <ArrowRight size={14} />
                </button>
              </div>
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Cargando…</div>
              ) : recentCitas.length === 0 ? (
                <div className="p-8 text-center">
                  <CalendarDays size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">No hay citas registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentCitas.map((c) => {
                    const badge = estadoBadge[c.estado] ?? { label: c.estado, classes: "bg-slate-100 text-slate-600" };
                    return (
                      <div key={c.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm font-semibold text-slate-600">
                          {c.paciente.nombre[0]}{c.paciente.apellidos[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.paciente.nombre} {c.paciente.apellidos}</p>
                          <p className="text-xs text-slate-500 truncate">{c.medico.titulo ? `${c.medico.titulo} ` : ""}{c.medico.nombre} · {c.motivo || "Sin motivo"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500 mb-1">{new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>{badge.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          {actions.length > 0 && (
            <div className={`${["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol) ? "" : "lg:col-span-3"} bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden`}>
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Acciones rápidas</h2>
              </div>
              <div className="p-4 space-y-1">
                {actions.slice(0, 6).map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.href} onClick={() => router.push(action.href)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left group">
                      <div className={`${action.color} p-2 rounded-lg`}><Icon size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{action.label}</p>
                        <p className="text-xs text-slate-500">{action.desc}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
