"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Search, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Equipo {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  updatedAt: string;
}

const ALLOWED = ["ADMINISTRADOR", "JEFE_BIOMEDICA"];

export default function DadosDeBajaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const rol = (session.user as any).rol;
      if (!ALLOWED.includes(rol)) { router.push("/dashboard"); return; }
      fetch("/api/equipos?baja=1")
        .then(r => r.json())
        .then(d => { setEquipos(Array.isArray(d) ? d : []); setLoading(false); });
    }
  }, [status, session, router]);

  const filtered = equipos.filter(e =>
    [e.nombre, e.marca, e.modelo, e.numeroSerie, e.ubicacion]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Equipos dados de baja</h1>
            <p className="text-sm text-slate-500">{filtered.length} equipo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar equipo…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No hay equipos dados de baja
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Marca / Modelo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Serie</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Área</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha baja</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-slate-800">{e.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{[e.marca, e.modelo].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{e.numeroSerie ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{e.ubicacion ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(e.updatedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/equipos/${e.id}`} className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 font-medium">
                        Ver historial <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
