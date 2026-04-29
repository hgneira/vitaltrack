"use client";

import { useEffect, useState, useMemo } from "react";
import { CheckCircle, Wrench, AlertTriangle, RefreshCw, X, Activity } from "lucide-react";
import Link from "next/link";

interface Equipo {
  id: string; nombre: string; marca?: string; modelo?: string;
  numeroSerie?: string; ubicacion?: string; estado: string;
  mantenimientos: { fecha: string }[];
}

interface RoomDef {
  id: string; label: string;
  x: number; y: number; w: number; h: number;
  fill: string; matches: string[]; noEquip?: boolean;
}

// ViewBox 0 0 940 670
// Building block x=20..900, y=20..630
// Outer wall = 12px, interior wall gap = 8px

const ROOMS: RoomDef[] = [
  { id:"Sala de Choque",      label:"SALA DE CHOQUE",          x:32,  y:32,  w:190, h:238, fill:"#fff1f2", matches:["choque","shock","reanimac","trauma"] },
  { id:"Cubículo 1",          label:"CUB. 1",                  x:230, y:32,  w:130, h:110, fill:"#f0f9ff", matches:["cubiculo 1","cub 1","cubiculo1"] },
  { id:"Cubículo 2",          label:"CUB. 2",                  x:368, y:32,  w:130, h:110, fill:"#f0f9ff", matches:["cubiculo 2","cub 2","cubiculo2"] },
  { id:"Cubículo 3",          label:"CUB. 3",                  x:506, y:32,  w:130, h:110, fill:"#f0f9ff", matches:["cubiculo 3","cub 3","cubiculo3"] },
  { id:"Cubículo 4",          label:"CUB. 4",                  x:230, y:150, w:130, h:120, fill:"#f0f9ff", matches:["cubiculo 4","cub 4","cubiculo4"] },
  { id:"Cubículo 5",          label:"CUB. 5",                  x:368, y:150, w:130, h:120, fill:"#f0f9ff", matches:["cubiculo 5","cub 5","cubiculo5"] },
  { id:"Cubículo 6",          label:"CUB. 6",                  x:506, y:150, w:130, h:120, fill:"#f0f9ff", matches:["cubiculo 6","cub 6","cubiculo6"] },
  { id:"Observación",         label:"OBSERVACIÓN",             x:644, y:32,  w:244, h:238, fill:"#eff6ff", matches:["observaci"] },
  { id:"Estación Enfermería", label:"EST. ENFERMERÍA",         x:32,  y:278, w:190, h:150, fill:"#f0fdf4", matches:["enfermer","estacion"] },
  { id:"Cubículo 7",          label:"CUB. 7",                  x:230, y:278, w:130, h:150, fill:"#f0f9ff", matches:["cubiculo 7","cub 7","cubiculo7"] },
  { id:"Cubículo 8",          label:"CUB. 8",                  x:368, y:278, w:130, h:150, fill:"#f0f9ff", matches:["cubiculo 8","cub 8","cubiculo8"] },
  { id:"Rayos X",             label:"RAYOS X / IMAGENOLOGÍA",  x:506, y:278, w:382, h:150, fill:"#faf5ff", matches:["rayos","radiolog","imagenolog"] },
  { id:"Triaje",              label:"TRIAJE",                  x:32,  y:436, w:266, h:108, fill:"#fff7ed", matches:["triaje","triage"] },
  { id:"Sala de Espera",      label:"SALA DE ESPERA",          x:306, y:436, w:582, h:108, fill:"#f9fafb", matches:["espera"] },
  { id:"Acceso",              label:"ACCESO / ENTRADA PRINCIPAL", x:32, y:552, w:856, h:60, fill:"#f1f5f9", matches:[], noEquip:true },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function matchRoom(ub: string, room: RoomDef) {
  if (!room.matches.length) return false;
  const u = normalize(ub);
  return room.matches.some(m => u.includes(normalize(m)));
}
type RS = "vacant"|"healthy"|"warning"|"critical";
function getStatus(eqs: Equipo[]): RS {
  if (!eqs.length) return "vacant";
  if (eqs.some(e => e.estado === "FUERA_DE_SERVICIO")) return "critical";
  if (eqs.some(e => e.estado === "EN_MANTENIMIENTO")) return "warning";
  return "healthy";
}
const STATUS_COLOR: Record<RS,string> = { vacant:"transparent", healthy:"#16a34a", warning:"#d97706", critical:"#dc2626" };

// ── Furniture helpers ────────────────────────────────────────────

function Bed({ cx, cy, w=42, h=68 }: { cx:number; cy:number; w?:number; h?:number }) {
  return (
    <g>
      <rect x={cx-w/2} y={cy-h/2} width={w} height={h} rx={4} fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1.2} />
      <rect x={cx-w/2+4} y={cy-h/2+4} width={w-8} height={h*0.28} rx={3} fill="#f4f7fb" stroke="#8fa0b4" strokeWidth={0.8} />
      <line x1={cx-w/2+5} y1={cy+h/2-7} x2={cx+w/2-5} y2={cy+h/2-7} stroke="#8fa0b4" strokeWidth={1.5} />
    </g>
  );
}

function NursesStation({ cx, cy }: { cx:number; cy:number }) {
  // D-shaped counter, open toward bottom (toward cubículos)
  return (
    <g>
      <path d={`M ${cx-55},${cy-20} L ${cx+55},${cy-20} A 55,45 0 0,1 ${cx-55},${cy-20} Z`}
        fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1.2} />
      <ellipse cx={cx} cy={cy-28} rx={32} ry={16} fill="#f4f7fb" stroke="#8fa0b4" strokeWidth={0.8} />
      {/* monitor */}
      <rect x={cx-10} y={cy-48} width={20} height={14} rx={2} fill="#c7d2de" stroke="#8fa0b4" strokeWidth={0.8} />
      <line x1={cx} y1={cy-34} x2={cx} y2={cy-30} stroke="#8fa0b4" strokeWidth={1} />
    </g>
  );
}

function XRayTable({ cx, cy }: { cx:number; cy:number }) {
  return (
    <g>
      <rect x={cx-60} y={cy-18} width={120} height={36} rx={5} fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1.2} />
      <ellipse cx={cx-20} cy={cy} rx={13} ry={13} fill="none" stroke="#8fa0b4" strokeWidth={1} />
      <line x1={cx-20} y1={cy-13} x2={cx-20} y2={cy+13} stroke="#8fa0b4" strokeWidth={0.8} />
      <line x1={cx-33} y1={cy} x2={cx-7} y2={cy} stroke="#8fa0b4" strokeWidth={0.8} />
      {/* lead barrier */}
      <line x1={cx+80} y1={cy-60} x2={cx+80} y2={cy+60} stroke="#8fa0b4" strokeWidth={2.5} strokeDasharray="8,4" />
      <text x={cx+84} y={cy+4} fontSize="7" fill="#8fa0b4" fontWeight="600" transform={`rotate(-90,${cx+84},${cy+4})`}>BARRERA PLOMADA</text>
    </g>
  );
}

function TriageDesk({ cx, cy }: { cx:number; cy:number }) {
  return (
    <g>
      <rect x={cx-50} y={cy-22} width={100} height={44} rx={4} fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1.2} />
      <rect x={cx-42} y={cy-14} width={26} height={18} rx={2} fill="#f0f9ff" stroke="#8fa0b4" strokeWidth={0.8} />
      <rect x={cx+10} y={cy-16} width={26} height={22} rx={3} fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1} />
    </g>
  );
}

function WaitingChairs({ room }: { room: RoomDef }) {
  const chairs = [];
  const cols = 7, rows = 3, cw = 18, ch = 18, hgap = 12, vgap = 10;
  const startX = room.x + (room.w - cols*(cw+hgap)) / 2;
  const startY = room.y + (room.h - rows*(ch+vgap)) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      chairs.push(
        <rect key={`${r}-${c}`}
          x={startX + c*(cw+hgap)} y={startY + r*(ch+vgap)}
          width={cw} height={ch} rx={3}
          fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1} />
      );
    }
  }
  return <g>{chairs}</g>;
}

// Door arc: hinge at (hx,hy), leaf length r, startAngle and sweep in degrees
function Door({ hx, hy, r=26, startDeg=0, sweepDeg=90 }: {
  hx:number; hy:number; r?:number; startDeg?:number; sweepDeg?:number;
}) {
  const toR = (d:number) => (d * Math.PI) / 180;
  const ex = hx + r * Math.cos(toR(startDeg));
  const ey = hy + r * Math.sin(toR(startDeg));
  const ax = hx + r * Math.cos(toR(startDeg + sweepDeg));
  const ay = hy + r * Math.sin(toR(startDeg + sweepDeg));
  const large = Math.abs(sweepDeg) > 180 ? 1 : 0;
  const sweep = sweepDeg > 0 ? 1 : 0;
  return (
    <g stroke="#64748b" fill="none">
      <line x1={hx} y1={hy} x2={ex} y2={ey} strokeWidth={1.5} />
      <path d={`M ${ex},${ey} A ${r},${r} 0 ${large},${sweep} ${ax},${ay}`}
        strokeWidth={1} strokeDasharray="3,2" />
    </g>
  );
}

const ESTADO_CFG = {
  ACTIVO:{ label:"Activo", color:"text-emerald-700", bg:"bg-emerald-100", icon:CheckCircle },
  EN_MANTENIMIENTO:{ label:"En mantenimiento", color:"text-amber-700", bg:"bg-amber-100", icon:Wrench },
  FUERA_DE_SERVICIO:{ label:"Fuera de servicio", color:"text-red-700", bg:"bg-red-100", icon:AlertTriangle },
} as const;

export default function MapaPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string|null>(null);
  const [hovered,  setHovered]  = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/equipos")
      .then(r => r.json())
      .then(d => setEquipos(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const roomEqs = useMemo(() => {
    const map: Record<string, Equipo[]> = {};
    ROOMS.forEach(r => { map[r.id] = []; });
    equipos.forEach(eq => {
      if (!eq.ubicacion) return;
      for (const room of ROOMS) {
        if (matchRoom(eq.ubicacion, room)) { map[room.id].push(eq); return; }
      }
    });
    return map;
  }, [equipos]);

  const selRoom = selected ? ROOMS.find(r => r.id === selected) : null;
  const selEqs  = selected ? (roomEqs[selected] ?? []) : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Activity size={16} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mapa de Urgencias</h1>
            <p className="text-xs text-slate-400">Planta baja · Departamento de Urgencias</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {([
              { c:"#16a34a", l:"Activo" },
              { c:"#d97706", l:"En mantenimiento" },
              { c:"#dc2626", l:"Fuera de servicio" },
              { c:"#cbd5e1", l:"Sin equipos" },
            ] as const).map(({c,l}) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── SVG Floor Plan ── */}
        <div className="flex-1 overflow-auto bg-[#d6dce4] flex items-start justify-center p-8">
          {loading ? (
            <div className="flex items-center justify-center w-full h-64">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[#f0f4f8] rounded-xl shadow-2xl ring-2 ring-slate-400/30 p-5 overflow-hidden">
              <svg viewBox="0 0 940 680" style={{ width:"100%", minWidth:680, maxWidth:920, fontFamily:"ui-monospace,monospace" }}>
                <defs>
                  {/* Wall hatching */}
                  <pattern id="hatch" patternUnits="userSpaceOnUse" width="5" height="5">
                    <path d="M0,5 L5,0 M-1,1 L1,-1 M4,6 L6,4" stroke="#1e3a5f" strokeWidth={0.7} />
                  </pattern>
                  <pattern id="hatch2" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(90)">
                    <path d="M0,5 L5,0" stroke="#1e3a5f" strokeWidth={0.7} />
                  </pattern>
                  <filter id="roomShadow" x="-2%" y="-2%" width="104%" height="104%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* Sheet background */}
                <rect x="0" y="0" width="940" height="680" fill="#f0f4f8" />

                {/* ── OUTER BUILDING WALL (solid + hatch) ── */}
                <rect x="20" y="20" width="880" height="608" fill="#1e3a5f" rx="3" />
                <rect x="20" y="20" width="880" height="608" fill="url(#hatch)" rx="3" opacity="0.25" />

                {/* ── ROOM FLOORS ── */}
                {ROOMS.map(room => {
                  const eqs = roomEqs[room.id] ?? [];
                  const status = room.noEquip ? "vacant" : getStatus(eqs);
                  const isSelected = selected === room.id;
                  const isHovered  = hovered === room.id && !room.noEquip;
                  return (
                    <g key={room.id}
                      style={{ cursor: room.noEquip ? "default" : "pointer" }}
                      onClick={() => { if (!room.noEquip) setSelected(selected === room.id ? null : room.id); }}
                      onMouseEnter={() => { if (!room.noEquip) setHovered(room.id); }}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <rect x={room.x} y={room.y} width={room.w} height={room.h}
                        fill={isSelected ? "#dbeafe" : isHovered ? "#e8f0fe" : room.fill}
                        filter="url(#roomShadow)"
                      />
                      {/* Status stripe */}
                      {status !== "vacant" && (
                        <rect x={room.x} y={room.y} width={room.w} height={4}
                          fill={STATUS_COLOR[status]} opacity={0.9} />
                      )}
                      {/* Selected border */}
                      {isSelected && (
                        <rect x={room.x} y={room.y} width={room.w} height={room.h}
                          fill="none" stroke="#3b82f6" strokeWidth={2.5} />
                      )}
                    </g>
                  );
                })}

                {/* ── INTERIOR WALL LINES (visual separators) ── */}
                {/* Horizontal: between cub rows 1-2 */}
                <rect x={230} y={142} width={406} height={8} fill="#1e3a5f" />
                <rect x={230} y={142} width={406} height={8} fill="url(#hatch)" opacity={0.2} />
                {/* Horizontal: Triaje/Espera bottom of corridor → acceso */}
                {/* (gaps already from room spacing) */}

                {/* ── DOOR ARCS ── */}
                {/* Sala de Choque → corridor, hinge top-right corner */}
                <Door hx={222} hy={110} r={28} startDeg={0} sweepDeg={90} />
                {/* Cubículo 1 bottom */}
                <Door hx={262} hy={142} r={24} startDeg={180} sweepDeg={-90} />
                {/* Cubículo 2 bottom */}
                <Door hx={400} hy={142} r={24} startDeg={180} sweepDeg={-90} />
                {/* Cubículo 3 bottom */}
                <Door hx={538} hy={142} r={24} startDeg={180} sweepDeg={-90} />
                {/* Cubículo 4 top */}
                <Door hx={262} hy={150} r={24} startDeg={180} sweepDeg={90} />
                {/* Cubículo 5 top */}
                <Door hx={400} hy={150} r={24} startDeg={180} sweepDeg={90} />
                {/* Cubículo 6 top */}
                <Door hx={538} hy={150} r={24} startDeg={180} sweepDeg={90} />
                {/* Cubículo 7 */}
                <Door hx={262} hy={278} r={24} startDeg={90} sweepDeg={-90} />
                {/* Cubículo 8 */}
                <Door hx={400} hy={278} r={24} startDeg={90} sweepDeg={-90} />
                {/* Observación */}
                <Door hx={644} hy={110} r={28} startDeg={180} sweepDeg={90} />
                {/* Enfermería */}
                <Door hx={222} hy={330} r={26} startDeg={0} sweepDeg={-90} />
                {/* Rayos X */}
                <Door hx={538} hy={278} r={26} startDeg={90} sweepDeg={-90} />
                {/* Triaje */}
                <Door hx={60} hy={436} r={26} startDeg={90} sweepDeg={90} />
                {/* Sala Espera */}
                <Door hx={340} hy={436} r={26} startDeg={90} sweepDeg={90} />
                {/* Acceso entrance doors */}
                <Door hx={400} hy={552} r={26} startDeg={270} sweepDeg={-90} />
                <Door hx={500} hy={552} r={26} startDeg={270} sweepDeg={90} />

                {/* ── FURNITURE ── */}

                {/* Sala de Choque — trauma bed + side table + crash cart */}
                <Bed cx={127} cy={155} w={55} h={95} />
                {/* Crash cart */}
                <rect x={59} y={92} width={30} height={44} rx={3} fill="#dde3ec" stroke="#8fa0b4" strokeWidth={1.2} />
                <line x1={59} y1={106} x2={89} y2={106} stroke="#8fa0b4" strokeWidth={0.8} />
                <line x1={59} y1={120} x2={89} y2={120} stroke="#8fa0b4" strokeWidth={0.8} />
                {/* Ceiling light cross */}
                <circle cx={127} cy={90} r={10} fill="none" stroke="#8fa0b4" strokeWidth={1} />
                <line x1={117} y1={90} x2={137} y2={90} stroke="#8fa0b4" strokeWidth={0.8} />
                <line x1={127} y1={80} x2={127} y2={100} stroke="#8fa0b4" strokeWidth={0.8} />
                {/* Monitor */}
                <rect x={178} y={100} width={26} height={20} rx={2} fill="#c7d2de" stroke="#8fa0b4" strokeWidth={0.8} />

                {/* Cubículos 1-6 */}
                {([
                  { cx:295, cy:78  }, { cx:433, cy:78  }, { cx:571, cy:78  },
                  { cx:295, cy:205 }, { cx:433, cy:205 }, { cx:571, cy:205 },
                ] as const).map(({ cx, cy }, i) => (
                  <Bed key={i} cx={cx} cy={cy} w={44} h={68} />
                ))}

                {/* Cubículos 7-8 */}
                <Bed cx={295} cy={348} w={44} h={80} />
                <Bed cx={433} cy={348} w={44} h={80} />

                {/* Observación — 4 beds top row, 2 beds bottom */}
                {([674, 724, 774, 824] as const).map((bx, i) => (
                  <Bed key={`obs-t${i}`} cx={bx} cy={82} w={38} h={64} />
                ))}
                {([694, 774] as const).map((bx, i) => (
                  <Bed key={`obs-b${i}`} cx={bx} cy={198} w={38} h={64} />
                ))}

                {/* Estación Enfermería */}
                <NursesStation cx={127} cy={358} />

                {/* Rayos X */}
                <XRayTable cx={648} cy={353} />

                {/* Triaje */}
                <TriageDesk cx={145} cy={490} />

                {/* Sala de Espera */}
                <WaitingChairs room={ROOMS.find(r => r.id === "Sala de Espera")!} />

                {/* Acceso — sliding door symbols */}
                <rect x={380} y={554} width={40} height={6} rx={1} fill="#8fa0b4" />
                <rect x={480} y={554} width={40} height={6} rx={1} fill="#8fa0b4" />
                {/* Entry arrows */}
                <path d="M 450,572 L 458,562 L 466,572" fill="none" stroke="#64748b" strokeWidth={1.5} />
                <line x1={458} y1={562} x2={458} y2={582} stroke="#64748b" strokeWidth={1.5} />

                {/* ── ROOM LABELS ── */}
                {ROOMS.map(room => {
                  const eqs = roomEqs[room.id] ?? [];
                  const cx = room.x + room.w / 2;
                  const cy = room.y + room.h / 2;
                  const hasEqs = !room.noEquip && eqs.length > 0;
                  const fs = room.w > 240 ? 11 : room.w < 140 ? 9 : 10;
                  return (
                    <g key={`lbl-${room.id}`} pointerEvents="none">
                      <text x={cx} y={cy + (hasEqs ? -8 : -1)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={fs} fontWeight="700"
                        fill={room.noEquip ? "#94a3b8" : "#1e3a5f"}
                        letterSpacing="0.8"
                      >
                        {room.label}
                      </text>
                      {hasEqs && (
                        <text x={cx} y={cy + 9}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={8} fill="#4a6282"
                        >
                          {eqs.length} equipo{eqs.length !== 1 ? "s" : ""}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ── STATUS DOTS (top-right corner of each room) ── */}
                {ROOMS.filter(r => !r.noEquip).map(room => {
                  const eqs = roomEqs[room.id] ?? [];
                  const status = getStatus(eqs);
                  if (status === "vacant") return null;
                  return (
                    <circle key={`dot-${room.id}`}
                      cx={room.x + room.w - 10} cy={room.y + 12} r={5}
                      fill={STATUS_COLOR[status]} stroke="white" strokeWidth={1.2}
                      pointerEvents="none"
                    />
                  );
                })}

                {/* ── NORTH ARROW ── */}
                <g transform="translate(900, 52)">
                  <circle cx="0" cy="0" r="20" fill="#f8fafc" stroke="#1e3a5f" strokeWidth="1.5" />
                  <polygon points="0,-15 5,5 0,1 -5,5" fill="#1e3a5f" />
                  <polygon points="0,15 5,-5 0,-1 -5,-5" fill="#cbd5e1" stroke="#1e3a5f" strokeWidth="0.5" />
                  <text x="0" y="-23" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e3a5f">N</text>
                </g>

                {/* ── SCALE BAR ── */}
                <g transform="translate(750, 640)">
                  <rect x="0" y="-4" width="30" height="8" fill="#1e3a5f" />
                  <rect x="30" y="-4" width="30" height="8" fill="#f8fafc" stroke="#1e3a5f" strokeWidth="1" />
                  <rect x="60" y="-4" width="30" height="8" fill="#1e3a5f" />
                  <text x="0" y="12" textAnchor="middle" fontSize="8" fill="#1e3a5f">0</text>
                  <text x="60" y="12" textAnchor="middle" fontSize="8" fill="#1e3a5f">10m</text>
                  <text x="90" y="12" textAnchor="middle" fontSize="8" fill="#1e3a5f">15m</text>
                  <text x="45" y="-10" textAnchor="middle" fontSize="8" fill="#1e3a5f" fontWeight="600">ESC. 1:100</text>
                </g>

                {/* ── TITLE BLOCK ── */}
                <rect x="20" y="635" width="880" height="38" fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
                <line x1="20" y1="649" x2="900" y2="649" stroke="#1e3a5f" strokeWidth="0.5" />
                <text x="30" y="645" fontSize="10" fontWeight="800" fill="#1e3a5f" letterSpacing="1.5">HOSPITAL · DEPARTAMENTO DE URGENCIAS</text>
                <text x="30" y="662" fontSize="8" fill="#4a6282" letterSpacing="0.5">PLANTA BAJA  ·  PLANO ARQUITECTÓNICO  ·  {new Date().getFullYear()}</text>
                <text x="870" y="654" textAnchor="end" fontSize="8" fill="#4a6282">VitalTrack</text>
              </svg>
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ── */}
        {selected && selRoom && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{selRoom.id}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selEqs.length} equipo{selEqs.length !== 1 ? "s" : ""} registrado{selEqs.length !== 1 ? "s" : ""}</p>
                {selEqs.length > 0 && (() => {
                  const a = selEqs.filter(e => e.estado === "ACTIVO").length;
                  const m = selEqs.filter(e => e.estado === "EN_MANTENIMIENTO").length;
                  const f = selEqs.filter(e => e.estado === "FUERA_DE_SERVICIO").length;
                  return (
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {a > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{a} activo{a !== 1 ? "s" : ""}</span>}
                      {m > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{m} en mant.</span>}
                      {f > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{f} fuera</span>}
                    </div>
                  );
                })()}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selEqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Activity size={28} className="opacity-40" />
                  <p className="text-sm">Sin equipos en esta área</p>
                </div>
              ) : selEqs.map(eq => {
                const cfg = ESTADO_CFG[eq.estado as keyof typeof ESTADO_CFG] ?? { label: eq.estado, color: "text-slate-600", bg: "bg-slate-100", icon: Activity };
                const Icon = cfg.icon;
                return (
                  <Link key={eq.id} href={`/dashboard/equipos/${eq.id}`}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors ring-1 ring-slate-100 group">
                    <div className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity size={14} className="text-slate-400 group-hover:text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{eq.nombre}</p>
                      {(eq.marca || eq.modelo) && (
                        <p className="text-xs text-slate-400 truncate">{[eq.marca, eq.modelo].filter(Boolean).join(" · ")}</p>
                      )}
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${cfg.bg} ${cfg.color}`}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
