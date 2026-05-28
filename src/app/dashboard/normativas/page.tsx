"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import {
  FileText, Upload, Trash2, Search, Plus, X, ExternalLink, Tag, ChevronDown,
} from "lucide-react";

const CATEGORIAS = [
  "NOM / Norma Oficial Mexicana",
  "Protocolo Clínico",
  "Reglamento Interno",
  "Manual de Procedimientos",
  "Política de Calidad",
  "Guía de Práctica Clínica",
  "Seguridad e Higiene",
  "Otro",
];

const CAN_MANAGE = ["ADMINISTRADOR", "JEFE_BIOMEDICA"];

interface Normativa {
  id: string;
  titulo: string;
  descripcion?: string | null;
  categoria?: string | null;
  url: string;
  createdAt: string;
  subidoPor: { nombre: string; apellidos?: string | null };
}

export default function NormativasPage() {
  const { data: session } = useSession();
  const rol: string = (session?.user as any)?.rol ?? "";
  const canManage = CAN_MANAGE.includes(rol);

  const [normativas, setNormativas] = useState<Normativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Normativa | null>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/normativas")
      .then((r) => r.json())
      .then((d) => setNormativas(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitulo(""); setDescripcion(""); setCategoria("");
    setUrlInput(""); setUploadMode("file"); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    let finalUrl = urlInput.trim();

    if (uploadMode === "file") {
      const file = fileRef.current?.files?.[0];
      if (!file) { alert("Selecciona un archivo PDF"); return; }
      setUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/normativas/upload",
        });
        finalUrl = blob.url;
      } catch {
        alert("Error al subir el archivo"); setUploading(false); return;
      }
      setUploading(false);
    }

    if (!finalUrl) { alert("Ingresa una URL o sube un archivo"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/normativas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descripcion, categoria, url: finalUrl }),
      });
      if (res.ok) { resetForm(); load(); }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta normativa?")) return;
    await fetch(`/api/normativas/${id}`, { method: "DELETE" });
    load();
    if (preview?.id === id) setPreview(null);
  };

  const toEmbedUrl = (url: string) => {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    if (url.includes("docs.google.com")) return url.replace(/\/edit.*$/, "/preview");
    return url;
  };

  const allCats = Array.from(new Set(normativas.map((n) => n.categoria).filter(Boolean))) as string[];

  const filtered = normativas.filter((n) => {
    const matchSearch = !search || n.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (n.descripcion ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || n.categoria === filterCat;
    return matchSearch && matchCat;
  });

  const catColor: Record<string, string> = {
    "NOM / Norma Oficial Mexicana": "bg-blue-100 text-blue-700",
    "Protocolo Clínico": "bg-violet-100 text-violet-700",
    "Reglamento Interno": "bg-orange-100 text-orange-700",
    "Manual de Procedimientos": "bg-teal-100 text-teal-700",
    "Política de Calidad": "bg-green-100 text-green-700",
    "Guía de Práctica Clínica": "bg-cyan-100 text-cyan-700",
    "Seguridad e Higiene": "bg-red-100 text-red-700",
    "Otro": "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className={`flex flex-col ${preview ? "w-80 shrink-0" : "flex-1"} transition-all duration-300`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Normativas</h1>
              <p className="text-sm text-slate-500 mt-0.5">{normativas.length} documento{normativas.length !== 1 ? "s" : ""} registrado{normativas.length !== 1 ? "s" : ""}</p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Plus size={15} />
                Agregar
              </button>
            )}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar normativa..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none bg-white"
              >
                <option value="">Todas</option>
                {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Upload form */}
        {showForm && canManage && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-slate-700">Nueva normativa</p>
                <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título *"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none bg-white"
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Toggle file/url */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-1.5 font-medium transition-colors ${uploadMode === "file" ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Subir PDF
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`flex-1 py-1.5 font-medium transition-colors ${uploadMode === "url" ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  URL / Drive
                </button>
              </div>

              {uploadMode === "file" ? (
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
              ) : (
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... o URL de Google Drive"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              )}

              <button
                type="submit"
                disabled={uploading || saving}
                className="w-full py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-60 transition-colors"
              >
                {uploading ? "Subiendo..." : saving ? "Guardando..." : "Guardar normativa"}
              </button>
            </form>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <FileText size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No hay normativas{search || filterCat ? " que coincidan" : " registradas"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setPreview(n)}
                  className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${preview?.id === n.id ? "bg-cyan-50 border-l-2 border-cyan-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{n.titulo}</p>
                      {n.descripcion && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{n.descripcion}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {n.categoria && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${catColor[n.categoria] ?? "bg-slate-100 text-slate-600"}`}>
                            <Tag size={10} />
                            {n.categoria}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {n.subidoPor.nombre} · {new Date(n.createdAt).toLocaleDateString("es-MX")}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — PDF preview */}
      {preview && (
        <div className="flex-1 flex flex-col border-l border-slate-200 bg-white min-w-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{preview.titulo}</p>
              {preview.categoria && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium mt-1 ${catColor[preview.categoria] ?? "bg-slate-100 text-slate-600"}`}>
                  <Tag size={10} />
                  {preview.categoria}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={13} />
                Abrir
              </a>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <iframe
            key={preview.id}
            src={toEmbedUrl(preview.url)}
            className="flex-1 w-full border-0"
            title={preview.titulo}
          />
        </div>
      )}
    </div>
  );
}
