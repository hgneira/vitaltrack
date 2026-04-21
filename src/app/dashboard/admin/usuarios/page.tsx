"use client";

import { useEffect, useState, useMemo } from "react";
import {
  UserCog, Plus, Search, Check, X, Pencil, Trash2, AlertTriangle,
  Stethoscope, HeartPulse, FlaskConical, SprayCan, Pill, Phone,
  Wrench, ShieldCheck, Users, ConciergeBell, Activity,
} from "lucide-react";

interface Usuario {
  id: string;
  nombre: string;
  apellidos?: string;
  titulo?: string;
  email: string;
  rol: string;
  especialidad?: string;
  subespecialidad?: string;
  cedulaProfesional?: string;
  escuela?: string;
  telefono?: string;
  foto?: string;
  activo: boolean;
  createdAt: string;
}

const ROL_CFG: Record<string, {
  label: string;
  color: string;     // badge bg+text
  avatar: string;    // avatar bg
  border: string;    // section accent
  icon: React.ElementType;
}> = {
  ADMINISTRADOR:       { label: "Administrador",   color: "bg-violet-100 text-violet-700", avatar: "bg-violet-500", border: "border-violet-200",  icon: ShieldCheck },
  MEDICO:              { label: "Médico",           color: "bg-cyan-100   text-cyan-700",   avatar: "bg-cyan-500",   border: "border-cyan-200",    icon: Stethoscope },
  ENFERMERIA:          { label: "Enfermería",       color: "bg-pink-100   text-pink-700",   avatar: "bg-pink-500",   border: "border-pink-200",    icon: HeartPulse },
  INGENIERIA_BIOMEDICA:{ label: "Ing. Biomédica",   color: "bg-blue-100   text-blue-700",   avatar: "bg-blue-500",   border: "border-blue-200",    icon: FlaskConical },
  JEFE_BIOMEDICA:      { label: "Jefe Biomédica",   color: "bg-indigo-100 text-indigo-700", avatar: "bg-indigo-500", border: "border-indigo-200",  icon: FlaskConical },
  RECEPCION:           { label: "Recepción",        color: "bg-amber-100  text-amber-700",  avatar: "bg-amber-500",  border: "border-amber-200",   icon: ConciergeBell },
  LIMPIEZA:            { label: "Limpieza",         color: "bg-emerald-100 text-emerald-700",avatar:"bg-emerald-500",border: "border-emerald-200", icon: SprayCan },
  MANTENIMIENTO:       { label: "Mantenimiento",    color: "bg-slate-100  text-slate-700",  avatar: "bg-slate-500",  border: "border-slate-200",   icon: Wrench },
  FARMACIA:            { label: "Farmacia",         color: "bg-orange-100 text-orange-700", avatar: "bg-orange-500", border: "border-orange-200",  icon: Pill },
  URGENCIAS:           { label: "Urgencias",        color: "bg-red-100    text-red-700",    avatar: "bg-red-500",    border: "border-red-200",     icon: Activity },
};

// Display order for sections
const ROL_ORDER = [
  "ADMINISTRADOR", "MEDICO", "ENFERMERIA",
  "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA",
  "RECEPCION", "LIMPIEZA", "MANTENIMIENTO", "FARMACIA", "URGENCIAS",
];

const emptyForm = { nombre: "", apellidos: "", titulo: "", email: "", password: "", rol: "MEDICO", especialidad: "", telefono: "" };
const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterRol, setFilterRol]   = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [deleteError, setDeleteError]   = useState("");
  const [deleting, setDeleting]         = useState(false);

  const load = async () => {
    const data = await fetch("/api/usuarios").then(r => r.json());
    setUsuarios(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return usuarios.filter(u => {
      const matchSearch = !q ||
        u.nombre.toLowerCase().includes(q) ||
        (u.apellidos ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRol = !filterRol || u.rol === filterRol;
      return matchSearch && matchRol;
    });
  }, [usuarios, search, filterRol]);

  // Group by role, keeping ROL_ORDER
  const groups = useMemo(() => {
    return ROL_ORDER
      .map(rol => ({ rol, users: filtered.filter(u => u.rol === rol) }))
      .filter(g => g.users.length > 0);
  }, [filtered]);

  // Count per role for filter pills
  const countByRol = useMemo(() => {
    const map: Record<string, number> = {};
    usuarios.forEach(u => { map[u.rol] = (map[u.rol] ?? 0) + 1; });
    return map;
  }, [usuarios]);

  const openNew  = () => { setEditId(null); setForm(emptyForm); setError(""); setShowForm(true); };
  const openEdit = (u: Usuario) => {
    setEditId(u.id);
    setForm({ nombre: u.nombre, apellidos: u.apellidos ?? "", titulo: u.titulo ?? "", email: u.email, password: "", rol: u.rol, especialidad: u.especialidad ?? "", telefono: u.telefono ?? "" });
    setError(""); setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const body: Record<string, unknown> = { ...form };
    if (editId && !form.password) delete body.password;
    const res = editId
      ? await fetch(`/api/usuarios/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/usuarios",            { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowForm(false); }
    else { const d = await res.json(); setError(d.error ?? "Error al guardar"); }
    setSaving(false);
  };

  const toggleActivo = async (u: Usuario) => {
    await fetch(`/api/usuarios/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !u.activo }) });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError("");
    const res = await fetch(`/api/usuarios/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) { await load(); setDeleteTarget(null); }
    else { const d = await res.json(); setDeleteError(d.error ?? "Error al eliminar"); }
    setDeleting(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <UserCog size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Gestión de Usuarios</h1>
          {!loading && (
            <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {usuarios.length}
            </span>
          )}
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
          <Plus size={15} /> Nuevo usuario
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {/* Search + role filter */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Role pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterRol(null)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                !filterRol ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users size={11} /> Todos
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${!filterRol ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                {usuarios.length}
              </span>
            </button>
            {ROL_ORDER.filter(r => countByRol[r]).map(rol => {
              const cfg = ROL_CFG[rol];
              const Icon = cfg.icon;
              const active = filterRol === rol;
              return (
                <button
                  key={rol}
                  onClick={() => setFilterRol(active ? null : rol)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                    active ? "bg-slate-900 text-white" : `${cfg.color} hover:opacity-80`
                  }`}
                >
                  <Icon size={11} />
                  {cfg.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-black/10"}`}>
                    {countByRol[rol]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-12 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ rol, users }) => {
              const cfg  = ROL_CFG[rol] ?? { label: rol, color: "bg-slate-100 text-slate-700", avatar: "bg-slate-400", border: "border-slate-200", icon: Users };
              const Icon = cfg.icon;
              return (
                <div key={rol}>
                  {/* Section header */}
                  <div className={`flex items-center gap-3 mb-3 pb-2 border-b-2 ${cfg.border}`}>
                    <div className={`w-7 h-7 rounded-lg ${cfg.avatar} flex items-center justify-center`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800">{cfg.label}</h2>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{users.length}</span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {users.map(u => (
                      <div key={u.id} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 hover:shadow-md transition-all group relative">
                        {/* Active/inactive indicator */}
                        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${u.activo ? "bg-emerald-400" : "bg-red-400"}`} title={u.activo ? "Activo" : "Inactivo"} />

                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-11 h-11 rounded-xl ${cfg.avatar} text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm overflow-hidden`}>
                            {u.foto
                              ? <img src={u.foto} alt="Foto" className="w-full h-full object-cover" />
                              : <>{u.nombre[0]}{u.apellidos?.[0] ?? ""}</>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.titulo ? `${u.titulo} ` : ""}{u.nombre} {u.apellidos ?? ""}</p>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>

                        {(u.especialidad || u.subespecialidad || u.cedulaProfesional || u.escuela || u.telefono) && (
                          <div className="mb-3 space-y-1">
                            {u.especialidad && (
                              <p className="text-xs font-medium text-slate-600 truncate">{u.especialidad}{u.subespecialidad ? <span className="font-normal text-slate-400"> · {u.subespecialidad}</span> : ""}</p>
                            )}
                            {u.escuela && (
                              <p className="text-[11px] text-slate-400 truncate">{u.escuela}</p>
                            )}
                            {u.cedulaProfesional && (
                              <p className="text-[11px] text-slate-400">Cédula: {u.cedulaProfesional}</p>
                            )}
                            {u.telefono && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Phone size={10} />{u.telefono}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => toggleActivo(u)}
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition-colors ${
                              u.activo ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-500 hover:bg-red-100"
                            }`}
                          >
                            {u.activo ? <><Check size={10} /> Activo</> : <><X size={10} /> Inactivo</>}
                          </button>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => { setDeleteTarget(u); setDeleteError(""); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">¿Eliminar usuario?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Se eliminará permanentemente a <strong>{deleteTarget.nombre} {deleteTarget.apellidos}</strong> ({deleteTarget.email}). Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            {deleteError && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{deleteError}</p>}
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">{editId ? "Editar usuario" : "Nuevo usuario"}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título</label>
                  <select value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className={inputClass}>
                    <option value="">—</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Dra.">Dra.</option>
                    <option value="Lic.">Lic.</option>
                    <option value="Ing.">Ing.</option>
                    <option value="Enf.">Enf.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos</label>
                  <input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Correo *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contraseña {editId ? "(dejar vacío para no cambiar)" : "*"}
                </label>
                <input required={!editId} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rol *</label>
                <select required value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} className={inputClass}>
                  {ROL_ORDER.map(r => <option key={r} value={r}>{ROL_CFG[r]?.label ?? r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Especialidad</label>
                  <input value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} className={inputClass} placeholder="Medicina General" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className={inputClass} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear usuario"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
