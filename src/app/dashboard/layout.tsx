"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope,
  SprayCan, Pill, UserCog, LogOut, ChevronRight, Bell, ClipboardList, UserCircle,
  Activity, Wrench, BarChart2, FileText,
} from "lucide-react";
import NotificationBell from "./_components/NotificationBell";

// Navigation items per role
const ALL_NAV = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: LayoutDashboard,
    exact: true,
    roles: ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "RECEPCION", "LIMPIEZA", "MANTENIMIENTO", "FARMACIA", "URGENCIAS"],
  },
  {
    section: "Mi Cuenta",
    items: [
      { href: "/dashboard/perfil", label: "Mi Perfil", icon: UserCircle, roles: ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "RECEPCION", "LIMPIEZA", "MANTENIMIENTO", "FARMACIA", "URGENCIAS"] },
    ],
  },
  {
    section: "Administración",
    items: [
      { href: "/dashboard/admin/usuarios", label: "Usuarios", icon: UserCog, roles: ["ADMINISTRADOR"] },
      { href: "/dashboard/empleados", label: "Empleados", icon: Users, roles: ["ADMINISTRADOR"] },
    ],
  },
  {
    section: "Área Médica",
    items: [
      { href: "/dashboard/admin/medicos", label: "Directorio Médico", icon: Stethoscope,  roles: ["ADMINISTRADOR"] },
      { href: "/dashboard/pacientes",     label: "Pacientes",         icon: Users,        roles: ["MEDICO", "ENFERMERIA", "RECEPCION"] },
      { href: "/dashboard/citas",         label: "Citas",             icon: CalendarDays, roles: ["MEDICO", "ENFERMERIA", "RECEPCION"] },
    ],
  },
  {
    section: "Ing. Biomédica",
    items: [
      { href: "/dashboard/biomedica", label: "Equipo Médico", icon: Stethoscope, roles: ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"] },
      { href: "/dashboard/biomedica/mis-tareas", label: "Mis tareas", icon: ClipboardList, roles: ["INGENIERIA_BIOMEDICA"] },
      { href: "/dashboard/biomedica/equipo", label: "Mi Equipo", icon: ClipboardList, roles: ["JEFE_BIOMEDICA"] },
      { href: "/dashboard/biomedica/equipo", label: "Equipo Biomédica", icon: Users, roles: ["ADMINISTRADOR"] },
    ],
  },
  {
    section: "Servicios",
    items: [
      { href: "/dashboard/limpieza", label: "Limpieza / Mantto.", icon: SprayCan, roles: ["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"] },
      { href: "/dashboard/farmacia", label: "Farmacia", icon: Pill, roles: ["ADMINISTRADOR", "FARMACIA"] },
    ],
  },
  {
    section: "Urgencias",
    items: [
      { href: "/dashboard/urgencias/inventario",    label: "Inventario",       icon: Activity,  roles: ["ADMINISTRADOR", "URGENCIAS"] },
      { href: "/dashboard/urgencias/mantenimiento", label: "Mantenimiento",    icon: Wrench,    roles: ["ADMINISTRADOR", "URGENCIAS"] },
      { href: "/dashboard/urgencias/kpis",          label: "Indicadores KPI",  icon: BarChart2, roles: ["ADMINISTRADOR", "URGENCIAS"] },
      { href: "/dashboard/urgencias/reportes",      label: "Reportes",         icon: FileText,  roles: ["ADMINISTRADOR", "URGENCIAS"] },
    ],
  },
];

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  MEDICO: "Médico",
  ENFERMERIA: "Enfermería",
  INGENIERIA_BIOMEDICA: "Ing. Biomédica",
  JEFE_BIOMEDICA: "Jefe Biomédica",
  RECEPCION: "Recepción",
  LIMPIEZA: "Limpieza",
  MANTENIMIENTO: "Mantenimiento",
  FARMACIA: "Farmacia",
  URGENCIAS: "Urgencias",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rol: string = (session?.user as any)?.rol ?? "";
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/perfil")
        .then((r) => r.json())
        .then((d) => { if (d.foto) setFoto(d.foto); })
        .catch(() => {});
    }
  }, [session]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavLink = ({ href, label, icon: Icon, exact }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) => {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          active ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <Icon size={16} className={active ? "text-white" : "text-slate-500 group-hover:text-white"} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={13} className="opacity-70" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-xl">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            {/* VitalTrack icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#1e3a5f", boxShadow: "0 0 0 2px #2d5a8e, 0 0 12px rgba(56,197,240,0.3)" }}>
              <svg viewBox="0 0 40 40" fill="none" className="w-6 h-6">
                {/* Location pin */}
                <circle cx="20" cy="10" r="3.5" fill="#38c5f0" />
                <path d="M20 13.5 L20 17" stroke="#38c5f0" strokeWidth="1.8" strokeLinecap="round" />
                {/* ECG / pulse line */}
                <path d="M4 22 L10 22 L13 17 L16 27 L19 19 L21 24 L23 22 L36 22"
                  stroke="#38c5f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            {/* Wordmark */}
            <div>
              <p className="text-sm font-extrabold leading-tight tracking-tight">
                <span className="text-white">Vital</span><span style={{ color: "#38c5f0" }}>Track</span>
              </p>
              <p className="text-[10px] leading-tight tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>DEVICE TRACKING</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Home */}
          <NavLink href="/dashboard" label="Inicio" icon={LayoutDashboard} exact />

          {/* Grouped sections */}
          {ALL_NAV.filter((item) => "section" in item).map((group) => {
            const g = group as { section: string; items: { href: string; label: string; icon: React.ElementType; roles: string[] }[] };
            const visibleItems = g.items.filter((i) => i.roles.includes(rol));
            if (visibleItems.length === 0) return null;
            return (
              <div key={g.section}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                  {g.section}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Alerts — visible to limpieza/mantenimiento */}
          {["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol) && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                Alertas
              </p>
              <NavLink href="/dashboard/alertas" label="Alertas" icon={Bell} />
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700/60">
          {session?.user && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                {foto
                  ? <img src={foto} alt="Foto" className="w-full h-full object-cover" />
                  : session.user.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{ROL_LABELS[rol] ?? rol}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global top bar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-end px-4 shrink-0">
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
