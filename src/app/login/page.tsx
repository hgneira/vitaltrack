"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle } from "lucide-react";

function VitalTrackLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circle icon */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full animate-pulse" style={{
          background: "radial-gradient(circle, rgba(56,197,240,0.15) 0%, transparent 70%)",
        }} />
        {/* Circle */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
          background: "#1e3a5f",
          boxShadow: "0 0 0 2px #2d5a8e, 0 0 40px rgba(56,197,240,0.4), 0 0 80px rgba(30,58,95,0.6)",
        }}>
          <svg viewBox="0 0 56 56" fill="none" className="w-12 h-12">
            {/* Location pin */}
            <circle cx="28" cy="13" r="5" fill="#38c5f0" />
            <path d="M28 18 L28 24" stroke="#38c5f0" strokeWidth="2.5" strokeLinecap="round" />
            {/* ECG / pulse line */}
            <path d="M4 32 L13 32 L17 23 L21 40 L25 27 L28 33 L31 32 L52 32"
              stroke="#38c5f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>
      {/* Wordmark */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline text-5xl font-extrabold tracking-tight leading-none" style={{ letterSpacing: "-2px" }}>
          <span className="text-white">Vital</span>
          <span style={{ color: "#38c5f0" }}>Track</span>
        </div>
        <p className="text-xs font-normal uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "4px" }}>
          Medical Device Tracking · Urgencias
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#04111f" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
          style={{ background: "radial-gradient(ellipse, rgba(27,227,255,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <VitalTrackLogo />
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-2xl p-8" style={{ background: "#071828", border: "1px solid rgba(82,210,255,0.12)" }}>
          <h2 className="text-base font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@medivex.com" required
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(82,210,255,0.15)",
                    color: "white",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(27,227,255,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(82,210,255,0.15)"}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(82,210,255,0.15)",
                    color: "white",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(27,227,255,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(82,210,255,0.15)"}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #1be3ff 0%, #0074c8 100%)", color: "#04111f" }}
            >
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} Medivex · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
