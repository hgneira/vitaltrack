"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope,
  SprayCan, Pill, UserCog, LogOut, ChevronRight, Bell, ClipboardList, UserCircle,
  Activity, Wrench, BarChart2, FileText, Menu, X, PanelLeftClose, PanelLeftOpen,
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

  // Desktop: collapsed state (persisted in localStorage)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  // Mobile: sidebar open as overlay
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (session?.user) {
      fetch("/api/perfil")
        .then((r) => r.json())
        .then((d) => { if (d.foto) setFoto(d.foto); })
        .catch(() => {});
    }
  }, [session]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavLink = ({
    href, label, icon: Icon, exact,
  }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) => {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          active ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <Icon size={16} className={`shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && active && <ChevronRight size={13} className="opacity-70 shrink-0" />}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/60 shrink-0">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          {/* VitalTrack icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#1e3a5f", boxShadow: "0 0 0 2px #2d5a8e, 0 0 12px rgba(56,197,240,0.3)" }}
          >
            <svg viewBox="0 0 40 40" fill="none" className="w-6 h-6">
              <circle cx="20" cy="10" r="3.5" fill="#38c5f0" />
              <path d="M20 13.5 L20 17" stroke="#38c5f0" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M4 22 L10 22 L13 17 L16 27 L19 19 L21 24 L23 22 L36 22"
                stroke="#38c5f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </svg>
          </div>
          {/* Wordmark */}
          {!collapsed && (
            <div>
              <p className="text-sm font-extrabold leading-tight tracking-tight">
                <span className="text-white">Vital</span><span style={{ color: "#38c5f0" }}>Track</span>
              </p>
              <p className="text-[10px] leading-tight tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>DEVICE TRACKING</p>
            </div>
          )}
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
              {!collapsed && (
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                  {g.section}
                </p>
              )}
              {collapsed && <div className="border-t border-slate-700/40 my-2" />}
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
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                Alertas
              </p>
            )}
            {collapsed && <div className="border-t border-slate-700/40 my-2" />}
            <NavLink href="/dashboard/alertas" label="Alertas" icon={Bell} />
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-700/60 shrink-0">
        {session?.user && !collapsed && (
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
        {session?.user && collapsed && (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
              {foto
                ? <img src={foto} alt="Foto" className="w-full h-full object-cover" />
                : session.user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && "Cerrar sesión"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop (persistent, collapsible) */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 text-white shrink-0 shadow-xl transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — mobile (overlay, full width) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white shadow-xl w-72 transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Global top bar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>

            {/* Collapse toggle — desktop only */}
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hidden md:flex items-center justify-center"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <NotificationBell />
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
