"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Plus, Search, ArrowRight, UserCircle, Pencil, Trash2, AlertTriangle, MapPin } from "lucide-react";

interface Paciente {
  id: string;
  nombre: string;
  apellidos: string;
  sexo: string;
  telefono?: string;
  email?: string;
  areaAsignada?: string;
  motivoConsulta?: string;
  estadoAtencion?: string;
}

const ESTADO_CFG: Record<string, { label: string; color: string }> = {
  ESPERA:     { label: "En espera",   color: "bg-amber-100 text-amber-700" },
  EN_ATENCION:{ label: "En atención", color: "bg-cyan-100 text-cyan-700" },
  ALTA:       { label: "Alta",        color: "bg-emerald-100 text-emerald-700" },
};

export default function PacientesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const rol: string = (session?.user as any)?.rol ?? "";
  const canRegister = ["ADMINISTRADOR", "RECEPCION"].includes(rol);
  const canSeeExpediente = ["ADMINISTRADOR", "MEDICO", "ENFERMERIA"].includes(rol);
  const canDelete = rol === "ADMINISTRADOR";

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Paciente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    fetch("/api/pacientes")
      .then((r) => r.json())
      .then((d) => { setPacientes(Array.isArray(d) ? d : []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = pacientes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      (p.areaAsignada ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/pacientes/${deleteTarget.id}`, { method: "DELETE" });
    await load();
    setDeleteTarget(null);
    setDeleting(false);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Pacientes</h1>
          {!loading && (
            <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {pacientes.length}
            </span>
          )}
        </div>
        {canRegister && (
          <button
            onClick={() => router.push("/dashboard/pacientes/nuevo")}
            className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus size={15} /> Registrar paciente
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="relative mb-5 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, área…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
            <UserCircle size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">
              {search ? "Sin resultados" : "No hay pacientes registrados"}
            </p>
            {!search && canRegister && (
              <button
                onClick={() => router.push("/dashboard/pacientes/nuevo")}
                className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700"
              >
                Registrar primer paciente
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Área asignada</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const estadoCfg = ESTADO_CFG[p.estadoAtencion ?? "ESPERA"] ?? ESTADO_CFG.ESPERA;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {p.nombre[0]}{p.apellidos[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{p.nombre} {p.apellidos}</p>
                            <p className="text-xs text-slate-400">{p.sexo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.areaAsignada ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            {p.areaAsignada}
                          </div>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[180px] truncate">
                        {p.motivoConsulta || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estadoCfg.color}`}>
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canSeeExpediente && (
                            <button
                              onClick={() => router.push(`/dashboard/pacientes/${p.id}`)}
                              className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-800 font-medium px-2 py-1 rounded-lg hover:bg-cyan-50"
                            >
                              Ver <ArrowRight size={13} />
                            </button>
                          )}
                          {canRegister && (
                            <button
                              onClick={() => router.push(`/dashboard/pacientes/${p.id}?edit=1`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Eliminar paciente</h2>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 mb-5">
              Se eliminará permanentemente a{" "}
              <span className="font-semibold">{deleteTarget.nombre} {deleteTarget.apellidos}</span>.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
