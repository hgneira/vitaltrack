"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, CheckCircle, Wrench, AlertTriangle, MapPin, X, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Equipo {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  estado: string;
  mantenimientos: { fecha: string }[];
}

interface RoomDef {
  id: string;
  label: string;
  sublabel?: string;
  x: number; y: number; w: number; h: number;
  matches: string[];
  noEquip?: boolean;
}

// Canonical urgencias floor plan
// ViewBox: 0 0 820 550
const ROOMS: RoomDef[] = [
  // ── Top row ──
  {
    id: "Sala de Choque",
    label: "Sala de", sublabel: "Choque",
    x: 8, y: 8, w: 170, h: 205,
    matches: ["choque", "shock", "reanimac", "trauma"],
  },
  { id: "Cubículo 1", label: "Cub. 1", x: 182, y: 8,   w: 121, h: 98,  matches: ["cubiculo 1", "cub 1", "cubiculo1", "cub1"] },
  { id: "Cubículo 2", label: "Cub. 2", x: 307, y: 8,   w: 121, h: 98,  matches: ["cubiculo 2", "cub 2", "cubiculo2", "cub2"] },
  { id: "Cubículo 3", label: "Cub. 3", x: 432, y: 8,   w: 121, h: 98,  matches: ["cubiculo 3", "cub 3", "cubiculo3", "cub3"] },
  {
    id: "Observación",
    label: "Observación",
    x: 557, y: 8, w: 255, h: 205,
    matches: ["observaci"],
  },
  // ── Second row (cubículos 4-6) ──
  { id: "Cubículo 4", label: "Cub. 4", x: 182, y: 110, w: 121, h: 103, matches: ["cubiculo 4", "cub 4", "cubiculo4", "cub4"] },
  { id: "Cubículo 5", label: "Cub. 5", x: 307, y: 110, w: 121, h: 103, matches: ["cubiculo 5", "cub 5", "cubiculo5", "cub5"] },
  { id: "Cubículo 6", label: "Cub. 6", x: 432, y: 110, w: 121, h: 103, matches: ["cubiculo 6", "cub 6", "cubiculo6", "cub6"] },
  // ── Middle row ──
  {
    id: "Estación Enfermería",
    label: "Estación", sublabel: "Enfermería",
    x: 8, y: 217, w: 170, h: 145,
    matches: ["enfermer", "estacion enferm", "nurses"],
  },
  { id: "Cubículo 7", label: "Cub. 7", x: 182, y: 217, w: 121, h: 145, matches: ["cubiculo 7", "cub 7", "cubiculo7", "cub7"] },
  { id: "Cubículo 8", label: "Cub. 8", x: 307, y: 217, w: 121, h: 145, matches: ["cubiculo 8", "cub 8", "cubiculo8", "cub8"] },
  {
    id: "Rayos X",
    label: "Rayos X / Imagenología",
    x: 432, y: 217, w: 380, h: 145,
    matches: ["rayos", "radiolog", "imagenolog"],
  },
  // ── Lower row ──
  {
    id: "Triaje",
    label: "Triaje",
    x: 8, y: 366, w: 255, h: 135,
    matches: ["triaje", "triage"],
  },
  {
    id: "Sala de Espera",
    label: "Sala de Espera",
    x: 267, y: 366, w: 545, h: 135,
    matches: ["espera"],
  },
  // ── Entrance ──
  {
    id: "Acceso",
    label: "Acceso / Entrada",
    x: 8, y: 505, w: 804, h: 38,
    matches: [],
    noEquip: true,
  },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchRoom(ubicacion: string, room: RoomDef): boolean {
  if (room.noEquip || room.matches.length === 0) return false;
  const u = normalize(ubicacion);
  return room.matches.some((m) => u.includes(normalize(m)));
}

type RoomStatus = "vacant" | "healthy" | "warning" | "critical";

function getRoomStatus(equipos: Equipo[]): RoomStatus {
  if (equipos.length === 0) return "vacant";
  if (equipos.some((e) => e.estado === "FUERA_DE_SERVICIO")) return "critical";
  if (equipos.some((e) => e.estado === "EN_MANTENIMIENTO")) return "warning";
  return "healthy";
}

const STATUS_STYLE: Record<RoomStatus, { fill: string; stroke: string; text: string }> = {
  vacant:   { fill: "#f8fafc", stroke: "#cbd5e1", text: "#94a3b8" },
  healthy:  { fill: "#dcfce7", stroke: "#6ee7b7", text: "#15803d" },
  warning:  { fill: "#fef9c3", stroke: "#fcd34d", text: "#92400e" },
  critical: { fill: "#fee2e2", stroke: "#fca5a5", text: "#991b1b" },
};

const SELECTED_STYLE = { fill: "#dbeafe", stroke: "#60a5fa", text: "#1e40af" };

const ESTADO_CFG = {
  ACTIVO:            { label: "Activo",            color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle },
  EN_MANTENIMIENTO:  { label: "En mantenimiento",  color: "text-amber-700",  bg: "bg-amber-100",  icon: Wrench },
  FUERA_DE_SERVICIO: { label: "Fuera de servicio", color: "text-red-700",    bg: "bg-red-100",    icon: AlertTriangle },
} as const;

export default function MapaUrgenciasPage() {
  const [equipos, setEquipos]   = useState<Equipo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered,  setHovered]  = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/equipos")
      .then((r) => r.json())
      .then((d) => { setEquipos(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Map each equipo to its room
  const roomEquipos = useMemo(() => {
    const map: Record<string, Equipo[]> = {};
    ROOMS.forEach((r) => { map[r.id] = []; });
    equipos.forEach((eq) => {
      if (!eq.ubicacion) return;
      for (const room of ROOMS) {
        if (matchRoom(eq.ubicacion, room)) {
          map[room.id].push(eq);
          return;
        }
      }
    });
    return map;
  }, [equipos]);

  const selectedEquipos = selected ? (roomEquipos[selected] ?? []) : [];
  const selectedRoom    = selected ? ROOMS.find((r) => r.id === selected) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <MapPin size={16} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Mapa de Urgencias</h1>
        </div>
        <div className="flex items-center gap-6">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {([
              { s: "healthy",  label: "Activo",          fill: "#dcfce7", stroke: "#6ee7b7" },
              { s: "warning",  label: "En mantenimiento", fill: "#fef9c3", stroke: "#fcd34d" },
              { s: "critical", label: "Fuera de servicio", fill: "#fee2e2", stroke: "#fca5a5" },
              { s: "vacant",   label: "Sin equipos",      fill: "#f8fafc", stroke: "#cbd5e1" },
            ] as const).map((l) => (
              <span key={l.s} className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border flex-shrink-0" style={{ background: l.fill, borderColor: l.stroke }} />
                {l.label}
              </span>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── SVG Map ── */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center p-6">
          {loading ? (
            <div className="flex items-center justify-center w-full h-64">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow ring-1 ring-slate-200 p-4 w-full max-w-4xl">
              <svg
                viewBox="0 0 820 550"
                className="w-full"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {/* Floor background */}
                <rect x="0" y="0" width="820" height="550" fill="#e2e8f0" rx="8" />

                {ROOMS.map((room) => {
                  const eqs       = roomEquipos[room.id] ?? [];
                  const status    = room.noEquip ? "vacant" : getRoomStatus(eqs);
                  const isSelected = selected === room.id;
                  const isHovered  = hovered === room.id;

                  const style = isSelected
                    ? SELECTED_STYLE
                    : STATUS_STYLE[status];

                  const fill        = isHovered && !room.noEquip && !isSelected ? style.fill + "cc" : style.fill;
                  const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;

                  const cx = room.x + room.w / 2;
                  const cy = room.y + room.h / 2;

                  // Decide label Y position based on content
                  const hasCount = !room.noEquip && eqs.length > 0;
                  const hasSub   = !!room.sublabel;
                  const labelLines = hasSub ? [room.label, room.sublabel!] : [room.label];
                  const lineH = 14;
                  const totalLabelH = labelLines.length * lineH;
                  const countH = hasCount ? 14 : 0;
                  const dotsH  = hasCount ? 14 : 0;
                  const blockH = totalLabelH + countH + dotsH;
                  const startY = cy - blockH / 2 + lineH / 2;

                  const activos = eqs.filter((e) => e.estado === "ACTIVO").length;
                  const enMant  = eqs.filter((e) => e.estado === "EN_MANTENIMIENTO").length;
                  const fuera   = eqs.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;
                  const dotGroups = [
                    { n: activos, color: "#16a34a" },
                    { n: enMant,  color: "#d97706" },
                    { n: fuera,   color: "#dc2626" },
                  ].filter((d) => d.n > 0);

                  const fontSize = room.w < 130 ? 10 : room.noEquip ? 10 : 11;

                  return (
                    <g
                      key={room.id}
                      style={{ cursor: room.noEquip ? "default" : "pointer" }}
                      onClick={() => {
                        if (room.noEquip) return;
                        setSelected(selected === room.id ? null : room.id);
                      }}
                      onMouseEnter={() => { if (!room.noEquip) setHovered(room.id); }}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <rect
                        x={room.x} y={room.y}
                        width={room.w} height={room.h}
                        rx={3}
                        fill={fill}
                        stroke={style.stroke}
                        strokeWidth={strokeWidth}
                      />

                      {/* Label */}
                      {labelLines.map((line, i) => (
                        <text
                          key={i}
                          x={cx} y={startY + i * lineH}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={fontSize}
                          fontWeight={room.noEquip ? "400" : "600"}
                          fill={room.noEquip ? "#94a3b8" : style.text}
                        >
                          {line}
                        </text>
                      ))}

                      {/* Equipment count */}
                      {hasCount && (
                        <text
                          x={cx} y={startY + labelLines.length * lineH + 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={9}
                          fill="#64748b"
                        >
                          {eqs.length} equipo{eqs.length !== 1 ? "s" : ""}
                        </text>
                      )}

                      {/* Status dots */}
                      {hasCount && dotGroups.length > 0 && (() => {
                        const dotSpacing = 11;
                        const totalW = (dotGroups.length - 1) * dotSpacing;
                        return dotGroups.map((d, di) => (
                          <circle
                            key={di}
                            cx={cx - totalW / 2 + di * dotSpacing}
                            cy={startY + labelLines.length * lineH + 14}
                            r={4}
                            fill={d.color}
                          />
                        ));
                      })()}
                    </g>
                  );
                })}

                {/* Compass label */}
                <text x="810" y="544" textAnchor="end" fontSize="9" fill="#94a3b8">
                  Planta baja · Urgencias
                </text>
              </svg>

              <p className="text-xs text-slate-400 text-center mt-2">
                Haz clic en un área para ver los equipos
              </p>
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        {selected && selectedRoom && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{selectedRoom.id}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEquipos.length} equipo{selectedEquipos.length !== 1 ? "s" : ""} registrado{selectedEquipos.length !== 1 ? "s" : ""}
                </p>
                {selectedEquipos.length > 0 && (() => {
                  const a = selectedEquipos.filter((e) => e.estado === "ACTIVO").length;
                  const m = selectedEquipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length;
                  const f = selectedEquipos.filter((e) => e.estado === "FUERA_DE_SERVICIO").length;
                  return (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {a > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{a} activo{a !== 1 ? "s" : ""}</span>}
                      {m > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{m} en mant.</span>}
                      {f > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{f} fuera</span>}
                    </div>
                  );
                })()}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-600 mt-0.5">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedEquipos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Activity size={28} className="opacity-40" />
                  <p className="text-sm">Sin equipos en esta área</p>
                </div>
              ) : (
                selectedEquipos.map((eq) => {
                  const cfg = ESTADO_CFG[eq.estado as keyof typeof ESTADO_CFG] ?? { label: eq.estado, color: "text-slate-600", bg: "bg-slate-100", icon: Activity };
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={eq.id}
                      href={`/dashboard/equipos/${eq.id}`}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors ring-1 ring-slate-100 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:ring-red-200">
                        <Activity size={14} className="text-slate-400 group-hover:text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{eq.nombre}</p>
                        {(eq.marca || eq.modelo) && (
                          <p className="text-xs text-slate-400 truncate">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>
                        )}
                        {eq.numeroSerie && (
                          <p className="text-xs font-mono text-slate-400">{eq.numeroSerie}</p>
                        )}
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${cfg.bg} ${cfg.color}`}>
                          <Icon size={9} /> {cfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
