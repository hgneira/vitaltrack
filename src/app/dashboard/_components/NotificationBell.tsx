"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CalendarCheck, AlertTriangle, Pill, Wrench, Stethoscope, X, CheckCheck, Clock,
} from "lucide-react";
import type { Notif } from "@/app/api/notificaciones/route";

const TIPO_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  cita:        { icon: CalendarCheck, color: "text-cyan-600",   bg: "bg-cyan-50" },
  alerta:      { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50" },
  medicamento: { icon: Pill,          color: "text-orange-600", bg: "bg-orange-50" },
  tarea:       { icon: Wrench,        color: "text-blue-600",   bg: "bg-blue-50" },
  equipo:      { icon: Stethoscope,   color: "text-violet-600", bg: "bg-violet-50" },
};

const STORAGE_KEY = "notifs_dismissed";
const EXPIRY_MS   = 7 * 24 * 60 * 60 * 1000;

function loadDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveDismissed(map: Record<string, number>) {
  const now    = Date.now();
  const pruned = Object.fromEntries(
    Object.entries(map).filter(([, ts]) => now - ts < EXPIRY_MS)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

type Tab = "nuevas" | "historial";

export default function NotificationBell() {
  const router = useRouter();
  const [open,      setOpen]      = useState(false);
  const [tab,       setTab]       = useState<Tab>("nuevas");
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/notificaciones")
      .then((r) => r.json())
      .then((d) => setNotifs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...dismissed, [id]: Date.now() };
    setDismissed(updated);
    saveDismissed(updated);
  };

  const undismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...dismissed };
    delete updated[id];
    setDismissed(updated);
    saveDismissed(updated);
  };

  const dismissAll = () => {
    const updated = { ...dismissed };
    nuevas.forEach((n) => { updated[n.id] = Date.now(); });
    setDismissed(updated);
    saveDismissed(updated);
  };

  const nuevas    = notifs.filter((n) => !dismissed[n.id]);
  const historial = notifs.filter((n) =>  dismissed[n.id])
    .sort((a, b) => (dismissed[b.id] ?? 0) - (dismissed[a.id] ?? 0));

  const count    = nuevas.length;
  const urgentes = nuevas.filter((n) => n.urgente).length;

  const listed = tab === "nuevas" ? nuevas : historial;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) { load(); setTab("nuevas"); } }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white ${urgentes > 0 ? "bg-red-500" : "bg-slate-500"}`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden z-50 max-h-[500px] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
            <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
            <div className="flex items-center gap-1">
              {tab === "nuevas" && count > 0 && (
                <button
                  onClick={dismissAll}
                  title="Marcar todas como vistas"
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-600 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <CheckCheck size={13} /> Todas vistas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-2 pb-0 shrink-0">
            <button
              onClick={() => setTab("nuevas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "nuevas" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Bell size={11} />
              Nuevas
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tab === "nuevas" ? (urgentes > 0 ? "bg-red-500 text-white" : "bg-slate-600 text-slate-200") : "bg-slate-200 text-slate-600"}`}>
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("historial")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "historial" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Clock size={11} />
              Historial
              {historial.length > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tab === "historial" ? "bg-slate-600 text-slate-200" : "bg-slate-200 text-slate-600"}`}>
                  {historial.length}
                </span>
              )}
            </button>
          </div>

          <div className="h-px bg-slate-100 mx-4 mt-2 shrink-0" />

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && listed.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Cargando…</div>
            ) : listed.length === 0 ? (
              <div className="p-8 text-center">
                {tab === "nuevas"
                  ? <><CheckCheck size={28} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-400">Todo al día</p></>
                  : <><Clock size={28} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-400">Sin historial aún</p></>
                }
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {listed.map((n) => {
                  const cfg       = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.alerta;
                  const Icon      = cfg.icon;
                  const isHistory = tab === "historial";
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors group ${isHistory ? "opacity-50 hover:opacity-80" : "hover:bg-slate-50"}`}
                    >
                      <button
                        className="flex items-start gap-3 flex-1 min-w-0 text-left"
                        onClick={() => { setOpen(false); router.push(n.href); }}
                      >
                        <div className={`${cfg.bg} p-1.5 rounded-lg shrink-0 mt-0.5`}>
                          <Icon size={13} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-slate-800">{n.titulo}</p>
                            {n.urgente && !isHistory && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">Urgente</span>
                            )}
                            {isHistory && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                                <CheckCheck size={10} /> Vista
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.descripcion}</p>
                        </div>
                      </button>

                      {/* Action button */}
                      {isHistory ? (
                        <button
                          onClick={(e) => undismiss(n.id, e)}
                          title="Marcar como nueva"
                          className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-cyan-500 hover:bg-cyan-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Bell size={11} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => dismiss(n.id, e)}
                          title="Marcar como vista"
                          className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
