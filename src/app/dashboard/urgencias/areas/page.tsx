"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutGrid, Users, Cpu, Clock, ChevronRight, ArrowRightLeft,
  X, RefreshCw, AlertTriangle, CheckCircle, Minus,
} from "lucide-react";

const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";

interface AreaOcupacion {
  id: string; nombre: string; categoria?: string; capacidadMaxima?: number;
  ocupados: number; equiposCount: number; estado: string; pct: number;
}

interface PacienteEnArea {
  id: string; nombre: string; apellidos: string; numeroExpediente?: string;
  estadoAtencion?: string; asignadoEn?: string; createdAt: string; motivoConsulta?: string;
}

interface EquipoEnArea {
  id: string; nombre: string; estado: string; marca?: string; modelo?: string; numeroSerie?: string;
}

interface AreaDetalle {
  area: AreaOcupacion;
  pacientes: PacienteEnArea[];
  equipos: EquipoEnArea[];
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function estadoColor(estado: string) {
  if (estado === "llena")      return { bg: "bg-red-500",    ring: "ring-red-300",    text: "text-red-700",    badge: "bg-red-100 text-red-700" };
  if (estado === "casi_llena") return { bg: "bg-amber-400",  ring: "ring-amber-300",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700" };
  if (estado === "disponible") return { bg: "bg-emerald-400", ring: "ring-emerald-300", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" };
  return { bg: "bg-slate-300", ring: "ring-slate-200", text: "text-slate-500", badge: "bg-slate-100 text-slate-500" };
}

function estadoLabel(estado: string) {
  if (estado === "llena")       return "Llena";
  if (estado === "casi_llena")  return "Casi llena";
  if (estado === "disponible")  return "Disponible";
  return "Sin capacidad";
}

function tiempoEnArea(fechaStr?: string, createdAtStr?: string): string {
  const desde = fechaStr ?? createdAtStr;
  if (!desde) return "—";
  const ms = Date.now() - new Date(desde).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}min`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AreasPage() {
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol ?? "";

  const [areas,         setAreas]         = useState<AreaOcupacion[]>([]);
  const [areaSeleccionada, setAreaSel]    = useState<string | null>(null);
  const [detalle,       setDetalle]        = useState<AreaDetalle | null>(null);
  const [loading,       setLoading]        = useState(true);
  const [loadingDet,    setLoadingDet]     = useState(false);
  const [modalMover,    setModalMover]     = useState<{ paciente: PacienteEnArea; areaOrigenId: string } | null>(null);
  const [moverAreaId,   setMoverAreaId]    = useState("");
  const [moverNota,     setMoverNota]      = useState("");
  const [savingMover,   setSavingMover]    = useState(false);
  const [filtroCateg,   setFiltroCateg]    = useState("Todos");

  const canEdit = ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION", "URGENCIAS"].includes(rol);

  const loadAreas = useCallback(async () => {
    const data = await fetch("/api/areas/ocupacion").then((r) => r.json());
    setAreas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const loadDetalle = useCallback(async (id: string) => {
    setLoadingDet(true);
    const data = await fetch(`/api/areas/${id}/detalles`).then((r) => r.json());
    setDetalle(data.area ? data : null);
    setLoadingDet(false);
  }, []);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  useEffect(() => {
    if (!PUSHER_KEY) return;
    let pusher: any = null;
    import("pusher-js").then(({ default: Pusher }) => {
      pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      const ch = pusher.subscribe("areas-urgencias");
      ch.bind("area-actualizada", () => {
        loadAreas();
        if (areaSeleccionada) loadDetalle(areaSeleccionada);
      });
    });
    return () => { if (pusher) pusher.disconnect(); };
  }, [loadAreas, loadDetalle, areaSeleccionada]);

  const selectArea = (id: string) => {
    setAreaSel(id);
    loadDetalle(id);
  };

  const moverPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMover || !moverAreaId) return;
    setSavingMover(true);
    const areaDestino = areas.find((a) => a.id === moverAreaId);
    await fetch(`/api/pacientes/${modalMover.paciente.id}/mover-area`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        areaDestinoId: moverAreaId,
        areaNombre:    areaDestino?.nombre ?? "",
        notas:         moverNota || undefined,
      }),
    });
    setModalMover(null);
    setMoverNota("");
    setSavingMover(false);
    loadAreas();
    if (areaSeleccionada) loadDetalle(areaSeleccionada);
  };

  // Categories
  const categorias = ["Todos", ...Array.from(new Set(areas.map((a) => a.categoria ?? "Otro").filter(Boolean))).sort()];
  const areasFiltradas = filtroCateg === "Todos" ? areas : areas.filter((a) => (a.categoria ?? "Otro") === filtroCateg);

  // Group areas by category for display
  const grouped = areasFiltradas.reduce<Record<string, AreaOcupacion[]>>((acc, a) => {
    const cat = a.categoria ?? "Otro";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  const areaActual = areaSeleccionada ? areas.find((a) => a.id === areaSeleccionada) : null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar de áreas ── */}
      <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={16} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Áreas del hospital</h2>
            {!loading && (
              <button onClick={loadAreas} className="ml-auto p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <RefreshCw size={13} />
              </button>
            )}
          </div>
          {/* Leyenda */}
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Disponible</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Casi llena</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Llena</span>
          </div>
        </div>

        {/* Category filter */}
        {categorias.length > 2 && (
          <div className="px-3 py-2 border-b border-slate-100 shrink-0 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFiltroCateg(cat)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap transition-colors ${
                    filtroCateg === cat ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            Object.entries(grouped).map(([cat, catAreas]) => (
              <div key={cat} className="mb-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-4 py-1">{cat}</p>
                {catAreas.map((area) => {
                  const cfg = estadoColor(area.estado);
                  const active = areaSeleccionada === area.id;
                  return (
                    <button
                      key={area.id}
                      onClick={() => selectArea(area.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        active ? "bg-cyan-50 border-l-2 border-cyan-500" : "hover:bg-slate-50 border-l-2 border-transparent"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${active ? "text-cyan-700" : "text-slate-700"}`}>{area.nombre}</p>
                        {area.capacidadMaxima ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  area.estado === "llena" ? "bg-red-500" : area.estado === "casi_llena" ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                                style={{ width: `${area.pct * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">{area.ocupados}/{area.capacidadMaxima}</span>
                          </div>
                        ) : area.equiposCount > 0 ? (
                          <p className="text-[10px] text-slate-400">{area.equiposCount} equipo{area.equiposCount !== 1 ? "s" : ""}</p>
                        ) : null}
                      </div>
                      {active && <ChevronRight size={12} className="text-cyan-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Panel de detalle ── */}
      <main className="flex-1 overflow-auto bg-slate-50 p-6">
        {!areaSeleccionada ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <LayoutGrid size={40} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Selecciona un área para ver su detalle</p>
            <p className="text-sm text-slate-400 mt-1">Pacientes asignados, equipos y estado en tiempo real</p>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-lg">
              {[
                { label: "Con pacientes", val: areas.filter((a) => a.ocupados > 0).length, color: "text-cyan-600" },
                { label: "Llenas",        val: areas.filter((a) => a.estado === "llena").length,      color: "text-red-600" },
                { label: "Disponibles",   val: areas.filter((a) => a.estado === "disponible").length, color: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl ring-1 ring-slate-200 p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : loadingDet ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detalle ? (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{detalle.area.nombre}</h1>
                  {detalle.area.categoria && <p className="text-xs text-slate-500 mt-0.5">{detalle.area.categoria}</p>}
                </div>
                {areaActual?.capacidadMaxima ? (
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${estadoColor(areaActual.estado).badge}`}>
                      {estadoLabel(areaActual.estado)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{areaActual.ocupados} de {areaActual.capacidadMaxima} ocupados</p>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                      <div
                        className={`h-full rounded-full ${estadoColor(areaActual.estado).bg}`}
                        style={{ width: `${(areaActual.pct ?? 0) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{detalle.equipos.length} equipo{detalle.equipos.length !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>

            {/* Patients */}
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={14} className="text-cyan-600" />
                Pacientes en el área
                <span className="text-[10px] font-semibold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{detalle.pacientes.length}</span>
              </h2>
              {detalle.pacientes.length === 0 ? (
                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-8 text-center">
                  <Users size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Sin pacientes asignados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detalle.pacientes.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl ring-1 ring-slate-200 p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-bold text-cyan-700 shrink-0">
                        {p.nombre[0]}{p.apellidos[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{p.nombre} {p.apellidos}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {p.numeroExpediente && (
                            <span className="text-[10px] text-slate-500 font-mono">{p.numeroExpediente}</span>
                          )}
                          {p.motivoConsulta && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{p.motivoConsulta}</span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={9} /> {tiempoEnArea(p.asignadoEn, p.createdAt)}
                          </span>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => { setModalMover({ paciente: p, areaOrigenId: areaSeleccionada! }); setMoverAreaId(""); }}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        >
                          <ArrowRightLeft size={11} /> Mover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Devices */}
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Cpu size={14} className="text-violet-600" />
                Equipos en el área
                <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{detalle.equipos.length}</span>
              </h2>
              {detalle.equipos.length === 0 ? (
                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-8 text-center">
                  <Cpu size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Sin equipos registrados en esta área</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {detalle.equipos.map((eq) => {
                    const enUso = detalle.pacientes.length > 0;
                    return (
                      <div key={eq.id} className="bg-white rounded-xl ring-1 ring-slate-200 p-3 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          eq.estado === "ACTIVO" ? "bg-emerald-50" :
                          eq.estado === "EN_MANTENIMIENTO" ? "bg-amber-50" : "bg-red-50"
                        }`}>
                          <Cpu size={14} className={
                            eq.estado === "ACTIVO" ? "text-emerald-600" :
                            eq.estado === "EN_MANTENIMIENTO" ? "text-amber-600" : "text-red-500"
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{eq.nombre}</p>
                          {eq.marca && <p className="text-[10px] text-slate-400 truncate">{eq.marca} {eq.modelo ?? ""}</p>}
                          <div className="flex items-center gap-1 mt-1">
                            {enUso && eq.estado === "ACTIVO" ? (
                              <span className="text-[9px] font-bold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">En uso</span>
                            ) : (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                eq.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-700" :
                                eq.estado === "EN_MANTENIMIENTO" ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-600"
                              }`}>
                                {eq.estado === "ACTIVO" ? "Disponible" : eq.estado === "EN_MANTENIMIENTO" ? "En mantenimiento" : "Fuera de servicio"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>

      {/* ── Modal mover paciente ── */}
      {modalMover && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Mover paciente</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMover.paciente.nombre} {modalMover.paciente.apellidos}
                </p>
              </div>
              <button onClick={() => setModalMover(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={moverPaciente} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Área de destino *</label>
                <select
                  required
                  value={moverAreaId}
                  onChange={(e) => setMoverAreaId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar área…</option>
                  {areas
                    .filter((a) => a.id !== modalMover.areaOrigenId)
                    .filter((a) => !a.capacidadMaxima || a.ocupados < a.capacidadMaxima)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}{a.capacidadMaxima ? ` (${a.ocupados}/${a.capacidadMaxima})` : ""}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Solo se muestran áreas con capacidad disponible</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={moverNota}
                  onChange={(e) => setMoverNota(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Motivo del traslado…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingMover || !moverAreaId}
                  className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
                >
                  {savingMover ? "Moviendo…" : "Mover paciente"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMover(null)}
                  className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
