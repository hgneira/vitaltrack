"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import {
  Hash, Lock, MessageCircle, Users, Send, AlertTriangle,
  Plus, X, Search, ChevronDown, Circle,
} from "lucide-react";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador", MEDICO: "Médico", ENFERMERIA: "Enfermería",
  JEFE_BIOMEDICA: "Director/Jefe", RECEPCION: "Recepción",
  MANTENIMIENTO: "Mantenimiento", URGENCIAS: "Urgencias",
};

interface Canal { id: string; nombre: string; tipo: string; rolAcceso?: string | null; mensajes?: Mensaje[] }
interface Mensaje {
  id: string; canalId: string; contenido: string; esUrgente: boolean; createdAt: string;
  autor: { id: string; nombre: string; apellidos?: string; rol: string; foto?: string | null };
}
interface ChatUser { id: string; nombre: string; apellidos?: string; rol: string; foto?: string | null }
interface Toast { id: string; autor: string; contenido: string; canal: string }

export default function ChatPage() {
  const { data: session } = useSession();
  const myId: string = (session?.user as any)?.id ?? "";
  const myRol: string = (session?.user as any)?.rol ?? "";
  // Read target canal from URL (set by notification clicks) — client-only to avoid SSR issues
  const targetCanalId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("canal")
    : null;

  const [canales, setCanales] = useState<Canal[]>([]);
  const [canalActivo, setCanalActivo] = useState<Canal | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const presenceRef = useRef<ReturnType<Pusher["subscribe"]> | null>(null);
  const activeChannelRef = useRef<ReturnType<Pusher["subscribe"]> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load channels ---
  useEffect(() => {
    if (!myId) return;
    fetch("/api/chat/canales")
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        setCanales(d);
        // Auto-select canal from URL param (e.g. from notification click)
        if (targetCanalId) {
          const target = d.find((c: Canal) => c.id === targetCanalId);
          if (target) setCanalActivo(target);
        }
      });
  }, [myId]);

  // --- Load users for DMs ---
  useEffect(() => {
    if (!myId) return;
    fetch("/api/chat/users")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); });
  }, [myId]);

  // --- Init Pusher presence (online users) ---
  useEffect(() => {
    if (!myId || !PUSHER_KEY) return;

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: "/api/chat/pusher/auth",
    });
    pusherRef.current = pusher;

    const presence = pusher.subscribe("presence-vitaltrack") as any;
    presenceRef.current = presence;

    presence.bind("pusher:subscription_succeeded", (members: any) => {
      const ids = new Set<string>();
      members.each((m: any) => ids.add(m.id));
      setOnlineIds(ids);
    });
    presence.bind("pusher:member_added", (m: any) =>
      setOnlineIds(prev => new Set([...prev, m.id])));
    presence.bind("pusher:member_removed", (m: any) =>
      setOnlineIds(prev => { const s = new Set(prev); s.delete(m.id); return s; }));

    return () => { pusher.disconnect(); };
  }, [myId]);

  // --- Subscribe to active canal via Pusher or fall back to polling ---
  useEffect(() => {
    if (activeChannelRef.current) {
      activeChannelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(activeChannelRef.current.name);
      activeChannelRef.current = null;
    }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (!canalActivo) return;

    if (PUSHER_KEY && pusherRef.current) {
      const ch = pusherRef.current.subscribe(`canal-${canalActivo.id}`);
      activeChannelRef.current = ch;
      ch.bind("nuevo-mensaje", (msg: Mensaje) => {
        // Ignore own messages — sender already has the optimistic version
        if (msg.autor.id === myId) return;
        setMensajes(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          if (msg.esUrgente) {
            const t: Toast = { id: msg.id, autor: msg.autor.nombre, contenido: msg.contenido, canal: canalActivo.nombre };
            setToasts(prev => [...prev, t]);
            setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 6000);
          }
          return [...prev, msg];
        });
      });
    } else {
      // Fallback: poll every 3s
      pollingRef.current = setInterval(() => {
        fetch(`/api/chat/canales/${canalActivo.id}/mensajes`)
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setMensajes(d); });
      }, 3000);
    }

    return () => {
      if (activeChannelRef.current) {
        activeChannelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(activeChannelRef.current.name);
        activeChannelRef.current = null;
      }
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [canalActivo?.id]);

  // --- Load messages when canal changes ---
  const loadMensajes = useCallback(async (canal: Canal) => {
    setLoadingMsg(true);
    const r = await fetch(`/api/chat/canales/${canal.id}/mensajes`);
    const d = await r.json();
    if (Array.isArray(d)) setMensajes(d);
    setLoadingMsg(false);
  }, []);

  useEffect(() => {
    if (canalActivo) loadMensajes(canalActivo);
  }, [canalActivo?.id]);

  // --- Auto-scroll ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // --- Send message ---
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || !canalActivo || sending) return;
    setSending(true);
    const optimistic: Mensaje = {
      id: `opt-${Date.now()}`, canalId: canalActivo.id, contenido: texto.trim(),
      esUrgente: urgente, createdAt: new Date().toISOString(),
      autor: { id: myId, nombre: (session?.user as any)?.name ?? "Yo", rol: myRol },
    };
    setMensajes(prev => [...prev, optimistic]);
    setTexto(""); setUrgente(false);

    try {
      const r = await fetch(`/api/chat/canales/${canalActivo.id}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: optimistic.contenido, esUrgente: optimistic.esUrgente }),
      });
      const saved: Mensaje = await r.json();
      // Replace optimistic with real
      setMensajes(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } finally {
      setSending(false);
    }
  };

  // --- Start DM ---
  const startDM = async (user: ChatUser) => {
    setShowUsers(false);
    const r = await fetch("/api/chat/canales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const canal: Canal = await r.json();
    setCanales(prev => {
      if (prev.find(c => c.id === canal.id)) return prev;
      return [...prev, canal];
    });
    setCanalActivo(canal);
  };

  // --- Group canales ---
  const generales = canales.filter(c => c.tipo === "GENERAL");
  const porRol = canales.filter(c => c.tipo === "ROL");
  const directos = canales.filter(c => c.tipo === "DIRECTO");

  const filteredUsers = users.filter(u =>
    !searchUser || `${u.nombre} ${u.apellidos ?? ""} ${ROL_LABELS[u.rol] ?? u.rol}`
      .toLowerCase().includes(searchUser.toLowerCase())
  );

  const groupedUsers = filteredUsers.reduce((acc, u) => {
    const g = ROL_LABELS[u.rol] ?? u.rol;
    if (!acc[g]) acc[g] = [];
    acc[g].push(u);
    return acc;
  }, {} as Record<string, ChatUser[]>);

  return (
    <div className="flex h-full bg-slate-900 text-white overflow-hidden">
      {/* Urgent toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm flex items-start gap-3 animate-in slide-in-from-right pointer-events-auto">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide mb-0.5">⚡ Urgente — {t.canal}</p>
              <p className="text-sm font-semibold">{t.autor}</p>
              <p className="text-xs opacity-90 truncate">{t.contenido}</p>
            </div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Left sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col border-r border-slate-700/60">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-700/60">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-sm">Chat VitalTrack</p>
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Nuevo mensaje directo"
            >
              <Plus size={15} />
            </button>
          </div>
          {PUSHER_KEY && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Circle size={7} className="fill-green-500 text-green-500" />
              <span className="text-[11px] text-slate-400">{onlineIds.size} en línea</span>
            </div>
          )}
        </div>

        {/* Channel list */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* General */}
          {generales.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-1">General</p>
              {generales.map(c => (
                <CanalItem key={c.id} canal={c} active={canalActivo?.id === c.id} onClick={() => setCanalActivo(c)} />
              ))}
            </div>
          )}

          {/* Por Rol */}
          {porRol.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-1">Canales</p>
              {porRol.map(c => (
                <CanalItem key={c.id} canal={c} active={canalActivo?.id === c.id} onClick={() => setCanalActivo(c)} />
              ))}
            </div>
          )}

          {/* DMs */}
          {directos.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-1">Mensajes directos</p>
              {directos.map(c => {
                // Extract other user's name
                const [, , uid1, uid2] = (c.rolAcceso ?? "").split(":");
                const otherId = uid1 === myId ? uid2 : uid1;
                const isOnline = onlineIds.has(otherId);
                return (
                  <button
                    key={c.id}
                    onClick={() => setCanalActivo(c)}
                    className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${canalActivo?.id === c.id ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                  >
                    <span className="relative shrink-0">
                      <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold">
                        {c.nombre[0]}
                      </span>
                      {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />}
                    </span>
                    <span className="truncate">{c.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Online count */}
        {PUSHER_KEY && onlineIds.size > 0 && (
          <div className="px-4 py-3 border-t border-slate-700/60">
            <p className="text-[11px] text-slate-500">{onlineIds.size} usuario{onlineIds.size !== 1 ? "s" : ""} en línea</p>
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {canalActivo ? (
          <>
            {/* Channel header */}
            <div className="h-12 bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-3 shrink-0">
              {canalActivo.tipo === "DIRECTO"
                ? <MessageCircle size={16} className="text-slate-400 shrink-0" />
                : canalActivo.tipo === "ROL"
                  ? <Lock size={16} className="text-slate-400 shrink-0" />
                  : <Hash size={16} className="text-slate-400 shrink-0" />
              }
              <span className="font-semibold text-sm">{canalActivo.nombre}</span>
              {canalActivo.tipo === "ROL" && (
                <span className="text-[11px] text-slate-500 ml-1">— Solo {canalActivo.rolAcceso ? ROL_LABELS[canalActivo.rolAcceso] ?? canalActivo.rolAcceso : ""}  y Administradores</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMsg ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Cargando mensajes...</div>
              ) : mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <MessageCircle size={40} className="mb-3 opacity-40" />
                  <p className="text-sm">No hay mensajes aún. ¡Sé el primero!</p>
                </div>
              ) : (
                mensajes.map((m, i) => {
                  const isMe = m.autor.id === myId;
                  const prevMsg = mensajes[i - 1];
                  const showHeader = !prevMsg || prevMsg.autor.id !== m.autor.id ||
                    new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;

                  return (
                    <div key={m.id} className={`${m.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                      {showHeader && (
                        <div className={`flex items-center gap-2 mt-3 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                            {m.autor.foto
                              ? <img src={m.autor.foto} alt="" className="w-full h-full object-cover" />
                              : m.autor.nombre[0]}
                          </div>
                          <span className="text-xs font-semibold text-slate-300">{m.autor.nombre}</span>
                          <span className="text-[10px] text-slate-600">
                            {new Date(m.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {m.esUrgente && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                              <AlertTriangle size={10} /> URGENTE
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"} pl-9`}>
                        <div className={`max-w-md px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          m.esUrgente
                            ? "bg-red-900/80 border border-red-500/50 text-red-100"
                            : isMe
                              ? "bg-cyan-700 text-white rounded-br-sm"
                              : "bg-slate-800 text-slate-100 rounded-bl-sm"
                        }`}>
                          {m.contenido}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-900 shrink-0">
              <form onSubmit={send} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUrgente(!urgente)}
                  title="Marcar como urgente"
                  className={`p-2 rounded-lg transition-colors shrink-0 ${urgente ? "bg-red-600 text-white" : "text-slate-500 hover:text-red-400 hover:bg-slate-800"}`}
                >
                  <AlertTriangle size={16} />
                </button>
                <input
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder={urgente ? "⚡ Mensaje urgente..." : `Mensaje en #${canalActivo.nombre}...`}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-800 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    urgente ? "border-red-500/60 focus:ring-red-500/40" : "border-slate-700 focus:ring-cyan-500/40"
                  }`}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || sending}
                  className="p-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 rounded-xl transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
            <MessageCircle size={48} className="opacity-30" />
            <p className="text-sm">Selecciona un canal para empezar</p>
          </div>
        )}
      </div>

      {/* New DM modal */}
      {showUsers && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowUsers(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <p className="font-semibold text-sm">Nuevo mensaje directo</p>
              <button onClick={() => setShowUsers(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {Object.entries(groupedUsers).map(([grupo, us]) => (
                <div key={grupo}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 py-1.5">{grupo}</p>
                  {us.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-bold overflow-hidden">
                          {u.foto ? <img src={u.foto} alt="" className="w-full h-full object-cover" /> : u.nombre[0]}
                        </div>
                        {onlineIds.has(u.id) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.nombre} {u.apellidos ?? ""}</p>
                        <p className="text-[11px] text-slate-400">{ROL_LABELS[u.rol] ?? u.rol}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CanalItem({ canal, active, onClick }: { canal: Canal; active: boolean; onClick: () => void }) {
  const lastMsg = canal.mensajes?.[0];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${active ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
    >
      {canal.tipo === "ROL" ? <Lock size={13} className="shrink-0" /> : <Hash size={13} className="shrink-0" />}
      <span className="truncate">{canal.nombre}</span>
    </button>
  );
}
