"use client";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARN_BEFORE_MS = 2 * 60 * 1000; // warn 2 min before

export default function SessionTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warning, setWarning] = useState(false);

  const reset = () => {
    setWarning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);

    warnRef.current = setTimeout(() => setWarning(true), TIMEOUT_MS - WARN_BEFORE_MS);
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
        <div className="text-4xl mb-3">⏱️</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Sesión por expirar</h2>
        <p className="text-sm text-slate-600 mb-4">
          Tu sesión se cerrará en 2 minutos por inactividad. ¿Deseas continuar?
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700"
          >
            Continuar sesión
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
