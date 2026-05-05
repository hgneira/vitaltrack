"use client";

import { useEffect, useState, useMemo } from "react";
import { X, MapPin, Package, ChevronRight } from "lucide-react";

interface AreaInfo {
  id: string;
  nombre: string;
  categoria: string;
  capacidad?: string;
}

interface Equipo {
  id: string;
  nombre: string;
  estado: string;
  ubicacion?: string;
}

const CAT_COLOR: Record<string, { fill: string; stroke: string; text: string }> = {
  "Acceso y Recepción":          { fill: "#e0f2fe", stroke: "#0284c7", text: "#0c4a6e" },
  "Clasificación (Triage)":      { fill: "#fef9c3", stroke: "#ca8a04", text: "#713f12" },
  "Consulta y Tratamiento":      { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  "Hidratación":                 { fill: "#ede9fe", stroke: "#7c3aed", text: "#3b0764" },
  "Enfermería y Coordinación":   { fill: "#fff7ed", stroke: "#ea580c", text: "#7c2d12" },
  "Médica y Administrativa":     { fill: "#f1f5f9", stroke: "#475569", text: "#0f172a" },
  "Servicios de Apoyo":          { fill: "#fce7f3", stroke: "#db2777", text: "#831843" },
  "Apoyo General":               { fill: "#f0fdf4", stroke: "#86efac", text: "#166534" },
};

const ESTADO_DOT: Record<string, string> = {
  ACTIVO: "#22c55e",
  EN_MANTENIMIENTO: "#f59e0b",
  FUERA_DE_SERVICIO: "#ef4444",
};

const ROOMS: { id: string; label: string; x: number; y: number; w: number; h: number; cat: string }[] = [
  // Row 1: Pasillo ambulancias
  { id: "Pasillo de Ambulancias", label: "Pasillo de Ambulancias", x: 10, y: 10, w: 1060, h: 48, cat: "Apoyo General" },

  // Row 2: Críticos + Servicios de Apoyo
  { id: "Sala de Choque",    label: "Sala de Choque",    x: 10,  y: 66, w: 200, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Sala de Curaciones", label: "Curaciones",       x: 218, y: 66, w: 160, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Sala de Yesos",     label: "Yesos",             x: 386, y: 66, w: 130, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Laboratorio Clínico de Urgencias", label: "Lab. Urgencias",  x: 524, y: 66, w: 140, h: 110, cat: "Servicios de Apoyo" },
  { id: "Sala de Rayos X",   label: "Rayos X",           x: 672, y: 66, w: 130, h: 110, cat: "Servicios de Apoyo" },
  { id: "Cuarto de Ultrasonido", label: "Ultrasonido",   x: 810, y: 66, w: 120, h: 110, cat: "Servicios de Apoyo" },
  { id: "Banco de Sangre / Área de Transfusión", label: "Banco de Sangre", x: 938, y: 66, w: 132, h: 110, cat: "Servicios de Apoyo" },

  // Row 3: Cubículos observación + Hidratación
  { id: "Cubículo de Observación General 1",    label: "Obs. G1", x: 10,  y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 2",    label: "Obs. G2", x: 106, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 3",    label: "Obs. G3", x: 202, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 4",    label: "Obs. G4", x: 298, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 5",    label: "Obs. G5", x: 394, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación General 6",    label: "Obs. G6", x: 490, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación Pediátrica 1", label: "Ped. 1",  x: 586, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Observación Pediátrica 2", label: "Ped. 2",  x: 682, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Aislamiento 1",            label: "Ais. 1",  x: 778, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Cubículo de Aislamiento 2",            label: "Ais. 2",  x: 874, y: 184, w: 88, h: 110, cat: "Consulta y Tratamiento" },
  { id: "Hidratación Adultos",    label: "Hidrat. Adultos", x: 970, y: 184, w: 100, h: 52, cat: "Hidratación" },
  { id: "Hidratación Pediátrica", label: "Hidrat. Pediat.", x: 970, y: 242, w: 100, h: 52, cat: "Hidratación" },

  // Row 4: Enfermería + Admin médica
  { id: "Central de Enfermeras",      label: "Central Enf.",  x: 10,  y: 302, w: 140, h: 90, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Medicamentos",     label: "Medicamentos",  x: 158, y: 302, w: 120, h: 90, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Material Estéril", label: "Mat. Estéril",  x: 286, y: 302, w: 110, h: 90, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Ropa Limpia",      label: "Ropa Limpia",   x: 404, y: 302, w: 95,  h: 90, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de Ropa Sucia",       label: "Ropa Sucia",    x: 507, y: 302, w: 95,  h: 90, cat: "Enfermería y Coordinación" },
  { id: "Cuarto de RPBI",             label: "RPBI",          x: 610, y: 302, w: 80,  h: 90, cat: "Enfermería y Coordinación" },
  { id: "Oficina del Médico Responsable",  label: "Of. Médico",  x: 698, y: 302, w: 110, h: 90, cat: "Médica y Administrativa" },
  { id: "Sala de Juntas y Trabajo Médico", label: "Sala Juntas", x: 816, y: 302, w: 110, h: 90, cat: "Médica y Administrativa" },
  { id: "Área de Trabajo de Enfermería",   label: "Trab. Enf.",  x: 934, y: 302, w: 136, h: 90, cat: "Médica y Administrativa" },

  // Row 5: Apoyo general
  { id: "Archivo de Expedientes",           label: "Archivo",        x: 10,  y: 400, w: 100, h: 80, cat: "Médica y Administrativa" },
  { id: "Almacén de Equipos y Suministros", label: "Almacén",        x: 118, y: 400, w: 110, h: 80, cat: "Apoyo General" },
  { id: "Cuarto de Limpieza",               label: "Limpieza",       x: 236, y: 400, w: 90,  h: 80, cat: "Apoyo General" },
  { id: "Sanitario Personal (Hombres)",     label: "San. H (Staff)", x: 334, y: 400, w: 100, h: 80, cat: "Apoyo General" },
  { id: "Sanitario Personal (Mujeres)",     label: "San. M (Staff)", x: 442, y: 400, w: 100, h: 80, cat: "Apoyo General" },
  { id: "Vestidor de Personal",             label: "Vestidor",       x: 550, y: 400, w: 100, h: 80, cat: "Apoyo General" },

  // Row 6: Triage
  { id: "Cubículo de Triage 1",     label: "Triage 1",   x: 10,  y: 490, w: 120, h: 90, cat: "Clasificación (Triage)" },
  { id: "Cubículo de Triage 2",     label: "Triage 2",   x: 138, y: 490, w: 120, h: 90, cat: "Clasificación (Triage)" },
  { id: "Cubículo de Triage 3",     label: "Triage 3",   x: 266, y: 490, w: 120, h: 90, cat: "Clasificación (Triage)" },
  { id: "Área de Descontaminación", label: "Descontam.", x: 394, y: 490, w: 130, h: 90, cat: "Clasificación (Triage)" },

  // Row 7: Acceso y Recepción
  { id: "Módulo de Recepción y Control", label: "Recepción",      x: 10,  y: 590, w: 180, h: 90, cat: "Acceso y Recepción" },
  { id: "Estación de Camillas",          label: "Est. Camillas",  x: 198, y: 590, w: 130, h: 90, cat: "Acceso y Recepción" },
  { id: "Estación de Sillas de Ruedas",  label: "Est. Sillas",    x: 336, y: 590, w: 130, h: 90, cat: "Acceso y Recepción" },
  { id: "Sala de Espera",                label: "Sala de Espera", x: 474, y: 590, w: 300, h: 90, cat: "Acceso y Recepción" },
  { id: "Sanitario Público (Hombres)",   label: "San. Públ. H",   x: 782, y: 590, w: 130, h: 90, cat: "Acceso y Recepción" },
  { id: "Sanitario Público (Mujeres)",   label: "San. Públ. M",   x: 920, y: 590, w: 150, h: 90, cat: "Acceso y Recepción" },

  // Entrada
  { id: "__entrada__", label: "ENTRADA PRINCIPAL", x: 390, y: 688, w: 300, h: 38, cat: "" },
];

export default function MapaUrgenciasPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/equipos").then(r => r.json()).catch(() => []),
      fetch("/api/areas?simple=1").then(r => r.json()).catch(() => []),
    ]).then(([eq, ar]) => {
      setEquipos(Array.isArray(eq) ? eq : []);
      setAreas(Array.isArray(ar) ? ar : []);
      setLoading(false);
    });
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
  const selectedArea = areas.find(a => a.nombre === selected);
  const selectedEquipos = selected ? (equiposByArea[selected] ?? []) : [];

  const categories = [...new Set(ROOMS.filter(r => r.cat && r.id !== "__entrada__").map(r => r.cat))];

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <MapPin size={16} className="text-slate-500" />
        <h1 className="text-lg font-bold text-slate-800">Mapa de Urgencias</h1>
        <span className="text-xs text-slate-400">— HGZ / IMSS</span>
        {loading && <span className="text-xs text-slate-400 ml-auto animate-pulse">Cargando…</span>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {/* Legend */}
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
          </div>

          <svg viewBox="0 0 1080 738" className="w-full rounded-xl shadow-lg bg-white border border-slate-200"
            style={{ maxHeight: "calc(100vh - 185px)", minHeight: 460 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="1080" height="738" fill="url(#grid)" />

            {ROOMS.map(room => {
              const isEntrance = room.id === "__entrada__";
              const c = isEntrance
                ? { fill: "#1e293b", stroke: "#0f172a", text: "#f8fafc" }
                : (CAT_COLOR[room.cat] ?? { fill: "#f1f5f9", stroke: "#94a3b8", text: "#1e293b" });
              const isSelected = selected === room.id;
              const eqCount = equiposByArea[room.id]?.length ?? 0;
              const hasEquip = eqCount > 0;
              const smallRoom = room.w < 100 || room.h < 70;

              return (
                <g key={room.id}
                  onClick={() => !isEntrance && setSelected(isSelected ? null : room.id)}
                  style={{ cursor: isEntrance ? "default" : "pointer" }}>
                  <rect
                    x={room.x} y={room.y} width={room.w} height={room.h}
                    rx={isEntrance ? 2 : 5}
                    fill={isSelected ? c.stroke : c.fill}
                    stroke={c.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + room.h / 2 - (hasEquip && !isEntrance ? 7 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={smallRoom ? 8 : 10}
                    fontWeight="600"
                    fill={isSelected ? "#fff" : c.text}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {room.label}
                  </text>
                  {hasEquip && !isEntrance && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + 9}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={7.5}
                      fill={isSelected ? "#bfdbfe" : "#94a3b8"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {eqCount} equipo{eqCount !== 1 ? "s" : ""}
                    </text>
                  )}
                  {isSelected && (
                    <rect x={room.x - 3} y={room.y - 3} width={room.w + 6} height={room.h + 6}
                      rx={7} fill="none" stroke={c.stroke} strokeWidth={2.5} opacity={0.4} />
                  )}
                </g>
              );
            })}

            {/* North arrow */}
            <g transform="translate(1045, 706)">
              <circle cx="0" cy="0" r="22" fill="white" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="0" y="-7" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e293b">N</text>
              <polygon points="0,-17 -5,-2 5,-2" fill="#1e293b" />
              <polygon points="0,17 -5,2 5,2" fill="#94a3b8" />
            </g>

            {/* Scale bar */}
            <g transform="translate(10, 725)">
              <line x1="0" y1="0" x2="100" y2="0" stroke="#64748b" strokeWidth="1.5" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#64748b" strokeWidth="1.5" />
              <line x1="100" y1="-4" x2="100" y2="4" stroke="#64748b" strokeWidth="1.5" />
              <text x="50" y="-6" textAnchor="middle" fontSize="8" fill="#64748b">10 m</text>
            </g>
          </svg>
        </div>

        {/* Side panel */}
        {selected && selectedRoom && selected !== "__entrada__" && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                  {selectedRoom.cat}
                </p>
                <h2 className="text-sm font-bold text-slate-900 leading-snug">{selectedRoom.id}</h2>
                {selectedArea?.capacidad && (
                  <p className="text-xs text-slate-500 mt-1">{selectedArea.capacidad}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 shrink-0">
                <X size={15} />
              </button>
            </div>

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
                        style={{ background: ESTADO_DOT[eq.estado] ?? "#94a3b8" }} />
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
