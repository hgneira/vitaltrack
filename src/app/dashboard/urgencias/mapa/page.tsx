"use client";

import { useEffect, useState, useMemo } from "react";
import { X, MapPin, Package, ChevronRight, AlertTriangle, Wrench, CheckCircle } from "lucide-react";

interface Equipo {
  id: string;
  nombre: string;
  estado: string;
  ubicacion?: string;
}

// ─── color palette ──────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { fill: string; stroke: string; text: string }> = {
  "Acceso y Recepción":        { fill: "#e0f2fe", stroke: "#0284c7", text: "#0c4a6e" },
  "Clasificación (Triage)":    { fill: "#fef9c3", stroke: "#ca8a04", text: "#713f12" },
  "Consulta y Tratamiento":    { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  "Hidratación":               { fill: "#ede9fe", stroke: "#7c3aed", text: "#3b0764" },
  "Enfermería y Coordinación": { fill: "#fff7ed", stroke: "#ea580c", text: "#7c2d12" },
  "Médica y Administrativa":   { fill: "#f1f5f9", stroke: "#475569", text: "#0f172a" },
  "Servicios de Apoyo":        { fill: "#fce7f3", stroke: "#db2777", text: "#831843" },
  "Apoyo General":             { fill: "#f0fdf4", stroke: "#86efac", text: "#166534" },
};

const ESTADO: Record<string, string> = {
  ACTIVO: "#22c55e",
  EN_MANTENIMIENTO: "#f59e0b",
  FUERA_DE_SERVICIO: "#ef4444",
};

function worstStatus(equipos: Equipo[]): "ok" | "warn" | "error" | "none" {
  if (!equipos.length) return "none";
  if (equipos.some(e => e.estado === "FUERA_DE_SERVICIO")) return "error";
  if (equipos.some(e => e.estado === "EN_MANTENIMIENTO")) return "warn";
  return "ok";
}

function statusStroke(s: ReturnType<typeof worstStatus>): string {
  if (s === "error") return "#ef4444";
  if (s === "warn")  return "#f59e0b";
  if (s === "ok")    return "#22c55e";
  return "";
}

// ─── room definitions ────────────────────────────────────────────────────────
// viewBox: 0 0 1260 660
// Right service column starts at x=1102, w=148

type RectRoom   = { shape?: "rect";   id: string; label: string; x: number; y: number; w: number; h: number; cat: string };
type CircleRoom = { shape: "circle";  id: string; label: string; cx: number; cy: number; r: number; cat: string };
type Room = RectRoom | CircleRoom;

const ROOMS: Room[] = [
  // ── PASILLO ──────────────────────────────────────────────────────────────
  { id: "Pasillo de Ambulancias", label: "Pasillo de Ambulancias",
    x: 10, y: 10, w: 1240, h: 38, cat: "Apoyo General" },

  // ── ROW B  (y=56, h=88) ─────────────────────────────────────────────────
  { id: "Sala de Yesos",                    label: "Yesos",          x: 10,  y: 56, w: 82,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 4",label: "Obs. G-4",       x: 92,  y: 56, w: 90,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 5",label: "Obs. G-5",       x: 182, y: 56, w: 90,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 6",label: "Obs. G-6",       x: 272, y: 56, w: 90,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Estación de Camillas",             label: "Est. Camillas",  x: 362, y: 56, w: 96,  h: 88, cat: "Apoyo General" },
  { id: "Estación de Sillas de Ruedas",     label: "Est. Sillas",    x: 458, y: 56, w: 96,  h: 88, cat: "Apoyo General" },
  { id: "Cubículo de Observación Pediátrica 1", label: "Obs. Ped-1", x: 554, y: 56, w: 90,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación Pediátrica 2", label: "Obs. Ped-2", x: 644, y: 56, w: 90,  h: 88, cat: "Consulta y Tratamiento" },
  { id: "Sanitario Personal (Hombres)",     label: "San. H",         x: 734, y: 56, w: 68,  h: 44, cat: "Apoyo General" },
  { id: "Sanitario Personal (Mujeres)",     label: "San. M",         x: 734, y:100, w: 68,  h: 44, cat: "Apoyo General" },
  { id: "Área de Trabajo de Enfermería",    label: "Trab. Enf.",     x: 802, y: 56, w: 80,  h: 88, cat: "Enfermería y Coordinación" },
  { id: "Sala de Juntas y Trabajo Médico",  label: "Sala Juntas",    x: 882, y: 56, w: 78,  h: 88, cat: "Médica y Administrativa" },
  { id: "Oficina del Médico Responsable",   label: "Of. Médico",     x: 960, y: 56, w: 142, h: 88, cat: "Médica y Administrativa" },
  { id: "Laboratorio Clínico de Urgencias", label: "Lab. Urgencias", x:1102, y: 56, w: 148, h: 88, cat: "Servicios de Apoyo" },

  // ── RIGHT SERVICE COLUMN  ────────────────────────────────────────────────
  { id: "Sala de Rayos X",    label: "Rayos X",       x:1102, y:152, w:148, h:140, cat: "Servicios de Apoyo" },
  { id: "Cuarto de Ropa Limpia", label: "Ropa Limpia", x:1102, y:300, w:148, h: 44, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Ropa Sucia",  label: "Ropa Sucia",  x:1102, y:344, w:148, h: 44, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Ultrasonido", label: "Ultrasonido", x:1102, y:396, w:148, h: 80, cat: "Servicios de Apoyo" },
  { id: "Banco de Sangre / Área de Transfusión", label: "Banco de Sangre", x:1102, y:484, w:148, h:148, cat: "Servicios de Apoyo" },

  // ── ROW C  (y=152, h=140) ────────────────────────────────────────────────
  { id: "Sala de Choque", label: "Sala de Choque", x: 10, y:152, w:110, h:140, cat: "Consulta y Tratamiento" },
  // ⬤ Central de Enfermeras — circle
  { shape: "circle", id: "Central de Enfermeras", label: "Central de\nEnfermeras",
    cx: 480, cy: 222, r: 65, cat: "Enfermería y Coordinación" },

  // ── ROW D  (y=300, h=88) ─────────────────────────────────────────────────
  { id: "Sala de Curaciones",               label: "Curaciones",     x:  10, y:300, w:110, h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 3",label: "Obs. G-3",       x: 120, y:300, w: 97, h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 2",label: "Obs. G-2",       x: 217, y:300, w: 97, h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 1",label: "Obs. G-1",       x: 314, y:300, w: 97, h: 88, cat: "Consulta y Tratamiento" },
  // gap ~411-545 = under circle
  { id: "Cubículo de Aislamiento 1",        label: "Ais. 1",         x: 545, y:300, w: 90, h: 88, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Aislamiento 2",        label: "Ais. 2",         x: 635, y:300, w: 90, h: 88, cat: "Consulta y Tratamiento" },
  // right sub-cells (stacked 2×3)
  { id: "Cuarto de Medicamentos",    label: "Medicamentos", x: 725, y:300, w: 84, h: 44, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Material Estéril",label: "Mat. Estéril", x: 809, y:300, w: 83, h: 44, cat: "Enfermería y Coordinación" },
  { id: "Archivo de Expedientes",    label: "Archivo",      x: 892, y:300, w: 83, h: 44, cat: "Médica y Administrativa" },
  { id: "Hidratación Pediátrica",    label: "Hidr. Ped.",   x: 725, y:344, w: 84, h:140, cat: "Hidratación" },
  { id: "Hidratación Adultos",       label: "Hidr. Adult.", x: 809, y:344, w: 83, h:140, cat: "Hidratación" },
  { id: "Cuarto de Limpieza",        label: "Limpieza",     x: 892, y:344, w: 83, h: 44, cat: "Apoyo General" },

  // ── ROW E  (y=396, h=80) — Triage + Recepción + Descontam ───────────────
  { id: "Cubículo de Triage 1",        label: "Triage 1",    x:  10, y:396, w:118, h: 80, cat: "Clasificación (Triage)" },
  { id: "Cubículo de Triage 2",        label: "Triage 2",    x: 128, y:396, w:118, h: 80, cat: "Clasificación (Triage)" },
  { id: "Módulo de Recepción y Control",label: "Recepción",  x: 246, y:396, w:168, h: 80, cat: "Acceso y Recepción" },
  { id: "Cubículo de Triage 3",        label: "Triage 3",    x: 414, y:396, w:118, h: 80, cat: "Clasificación (Triage)" },
  { id: "Área de Descontaminación",    label: "Descontam.",  x: 532, y:396, w:193, h: 80, cat: "Clasificación (Triage)" },

  // ── ROW F  (y=484, h=70) ────────────────────────────────────────────────
  { id: "Estación de Camillas",      label: "Est. Camillas", x:  10, y:484, w:160, h: 70, cat: "Apoyo General" },
  // Sala de Espera spans rows F+G
  { id: "Sala de Espera",            label: "Sala de Espera", x: 170, y:484, w:555, h:148, cat: "Acceso y Recepción" },
  { id: "Sanitario Público (Hombres)", label: "San. H",       x: 725, y:484, w:125, h: 70, cat: "Apoyo General" },
  { id: "Almacén de Equipos y Suministros", label: "Almacén", x: 850, y:484, w:125, h: 70, cat: "Apoyo General" },

  // ── ROW G  (y=554, h=78) ────────────────────────────────────────────────
  { id: "Estación de Sillas de Ruedas", label: "Est. Sillas", x:  10, y:554, w:160, h: 78, cat: "Apoyo General" },
  { id: "Sanitario Público (Mujeres)",  label: "San. M",      x: 725, y:554, w:125, h: 78, cat: "Apoyo General" },
  { id: "Vestidor de Personal",         label: "Vestidores",  x: 850, y:554, w:125, h: 78, cat: "Apoyo General" },

  // ── ENTRADA ─────────────────────────────────────────────────────────────
  { id: "__entrada__", label: "ENTRADA PRINCIPAL", x: 420, y: 642, w: 290, h: 10, cat: "" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function roomCenter(r: Room): [number, number] {
  if (r.shape === "circle") return [r.cx, r.cy];
  return [r.x + r.w / 2, r.y + r.h / 2];
}

// ─── component ───────────────────────────────────────────────────────────────
export default function MapaUrgenciasPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/equipos")
      .then(r => r.json())
      .then(d => { setEquipos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const equiposByArea = useMemo(() => {
    const map: Record<string, Equipo[]> = {};
    equipos.forEach(eq => {
      if (eq.ubicacion) {
        if (!map[eq.ubicacion]) map[eq.ubicacion] = [];
        map[eq.ubicacion].push(eq);
      }
    });
    return map;
  }, [equipos]);

  const selectedRoom = ROOMS.find(r => r.id === selected);
  const selectedEquipos = selected ? (equiposByArea[selected] ?? []) : [];
  const categories = [...new Set(ROOMS.filter(r => r.cat && r.id !== "__entrada__").map(r => r.cat))];

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <MapPin size={16} className="text-slate-500" />
        <h1 className="text-lg font-bold text-slate-800">Mapa de Urgencias</h1>
        <span className="text-xs text-slate-400">— Área de Urgencias</span>
        {loading && <span className="text-xs text-slate-400 ml-auto animate-pulse">Cargando equipos…</span>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* map area */}
        <div className="flex-1 overflow-auto p-4">
          {/* legend */}
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map(cat => {
              const c = CAT_COLOR[cat] ?? { fill: "#f1f5f9", stroke: "#94a3b8", text: "#1e293b" };
              return (
                <span key={cat} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                  style={{ background: c.fill, borderColor: c.stroke, color: c.text }}>
                  {cat}
                </span>
              );
            })}
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-700 ml-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Fuera de servicio
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> En mantenimiento
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-green-300 bg-green-50 text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Activo
            </span>
          </div>

          <svg viewBox="0 0 1260 660"
            className="w-full rounded-xl shadow-lg bg-white border border-slate-200"
            style={{ maxHeight: "calc(100vh - 195px)", minHeight: 440 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="1260" height="660" fill="url(#grid)" />

            {ROOMS.map(room => {
              const isEntrance = room.id === "__entrada__";
              const c = isEntrance
                ? { fill: "#1e293b", stroke: "#0f172a", text: "#f8fafc" }
                : (CAT_COLOR[room.cat] ?? { fill: "#f1f5f9", stroke: "#94a3b8", text: "#1e293b" });

              const isSelected = selected === room.id;
              const eqs = equiposByArea[room.id] ?? [];
              const status = worstStatus(eqs);
              const strokeColor = isSelected ? "#1e40af" : (status !== "none" ? statusStroke(status) : c.stroke);
              const strokeWidth = isSelected ? 3 : (status !== "none" ? 2.5 : 1.5);

              if (room.shape === "circle") {
                const [lx, ly] = [room.cx, room.cy];
                const lines = room.label.split("\n");
                return (
                  <g key={room.id}
                    onClick={() => setSelected(isSelected ? null : room.id)}
                    style={{ cursor: "pointer" }}>
                    <circle
                      cx={room.cx} cy={room.cy} r={room.r}
                      fill={isSelected ? c.stroke : c.fill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                    {isSelected && (
                      <circle cx={room.cx} cy={room.cy} r={room.r + 5}
                        fill="none" stroke="#1e40af" strokeWidth={2} opacity={0.4} strokeDasharray="4 2" />
                    )}
                    {lines.map((ln, i) => (
                      <text key={i}
                        x={lx} y={ly + (i - (lines.length - 1) / 2) * 13 - (eqs.length ? 6 : 0)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={9} fontWeight="600"
                        fill={isSelected ? "#fff" : c.text}
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {ln}
                      </text>
                    ))}
                    {eqs.length > 0 && (
                      <text x={lx} y={ly + (lines.length) * 6 + 4}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={7.5}
                        fill={isSelected ? "#bfdbfe" : "#94a3b8"}
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {eqs.length} equipo{eqs.length !== 1 ? "s" : ""}
                      </text>
                    )}
                    {status !== "none" && (
                      <circle cx={room.cx + room.r - 8} cy={room.cy - room.r + 8} r={6}
                        fill={statusStroke(status)} stroke="white" strokeWidth={1.5} />
                    )}
                  </g>
                );
              }

              // rect room
              const smallRoom = room.w < 100 || room.h < 60;
              const [cx, cy] = roomCenter(room);

              return (
                <g key={room.id}
                  onClick={() => !isEntrance && setSelected(isSelected ? null : room.id)}
                  style={{ cursor: isEntrance ? "default" : "pointer" }}>
                  <rect
                    x={room.x} y={room.y} width={room.w} height={room.h}
                    rx={isEntrance ? 2 : 4}
                    fill={isSelected ? c.stroke : c.fill}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                  {isSelected && (
                    <rect x={room.x - 3} y={room.y - 3} width={room.w + 6} height={room.h + 6}
                      rx={6} fill="none" stroke="#1e40af" strokeWidth={2} opacity={0.4} strokeDasharray="4 2" />
                  )}
                  <text
                    x={cx} y={cy - (eqs.length > 0 && !isEntrance ? 7 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={smallRoom ? 7.5 : 9.5}
                    fontWeight="600"
                    fill={isSelected ? "#fff" : c.text}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {room.label}
                  </text>
                  {eqs.length > 0 && !isEntrance && (
                    <text x={cx} y={cy + 8}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={7}
                      fill={isSelected ? "#bfdbfe" : "#94a3b8"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {eqs.length} equipo{eqs.length !== 1 ? "s" : ""}
                    </text>
                  )}
                  {status !== "none" && !isEntrance && (
                    <circle cx={room.x + room.w - 8} cy={room.y + 8} r={5}
                      fill={statusStroke(status)} stroke="white" strokeWidth={1.5} />
                  )}
                </g>
              );
            })}

            {/* north arrow */}
            <g transform="translate(1228, 640)">
              <circle cx="0" cy="0" r="16" fill="white" stroke="#cbd5e1" strokeWidth="1.2" />
              <text x="0" y="-5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1e293b">N</text>
              <polygon points="0,-12 -3.5,-2 3.5,-2" fill="#1e293b" />
              <polygon points="0,12 -3.5,2 3.5,2" fill="#94a3b8" />
            </g>
          </svg>
        </div>

        {/* side panel */}
        {selected && selectedRoom && selected !== "__entrada__" && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                  {selectedRoom.cat}
                </p>
                <h2 className="text-sm font-bold text-slate-900 leading-snug">{selectedRoom.id}</h2>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 shrink-0">
                <X size={15} />
              </button>
            </div>

            {/* status summary */}
            {selectedEquipos.length > 0 && (() => {
              const status = worstStatus(selectedEquipos);
              const activos = selectedEquipos.filter(e => e.estado === "ACTIVO").length;
              const manten  = selectedEquipos.filter(e => e.estado === "EN_MANTENIMIENTO").length;
              const fuera   = selectedEquipos.filter(e => e.estado === "FUERA_DE_SERVICIO").length;
              return (
                <div className="px-5 py-3 border-b border-slate-100 flex gap-3 text-xs">
                  {activos > 0 && (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle size={12} /> {activos} activo{activos !== 1 ? "s" : ""}
                    </span>
                  )}
                  {manten > 0 && (
                    <span className="flex items-center gap-1 text-amber-700">
                      <Wrench size={12} /> {manten} mant.
                    </span>
                  )}
                  {fuera > 0 && (
                    <span className="flex items-center gap-1 text-red-700">
                      <AlertTriangle size={12} /> {fuera} fuera
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="flex-1 overflow-auto p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Equipos asignados
                </span>
                {selectedEquipos.length > 0 && (
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                    {selectedEquipos.length}
                  </span>
                )}
              </div>

              {selectedEquipos.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Package size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin equipos registrados</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedEquipos.map(eq => (
                    <li key={eq.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: ESTADO[eq.estado] ?? "#94a3b8" }} />
                      <span className="text-sm text-slate-800 font-medium flex-1 truncate">{eq.nombre}</span>
                      <ChevronRight size={13} className="text-slate-300 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
