"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, ShieldCheck, X, CheckSquare, Square } from "lucide-react";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow";

// ── Informed Consent Modal (LFPDPPP) ─────────────────────────────────────────
function ConsentModal({
  onAccept,
  onCancel,
}: {
  onAccept: (data: { firmanteTipo: string; firmanteNombre: string; firmanteRelacion: string }) => void;
  onCancel: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [firmanteTipo, setFirmanteTipo] = useState("PACIENTE");
  const [firmanteNombre, setFirmanteNombre] = useState("");
  const [firmanteRelacion, setFirmanteRelacion] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-cyan-600" />
            <h2 className="font-semibold text-slate-900">Aviso de Privacidad y Consentimiento</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Tratamiento de datos personales — LFPDPPP</p>

          <p>
            De conformidad con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>, se
            le informa que esta institución recabará y tratará sus datos personales, incluyendo datos sensibles de salud, con las siguientes
            finalidades:
          </p>

          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
            <li>Brindar atención médica y gestión de expediente clínico</li>
            <li>Coordinación con especialistas e interconsultas</li>
            <li>Registros estadísticos y de calidad de atención</li>
            <li>Cumplimiento de obligaciones legales (NOM-004-SSA3-2012)</li>
          </ul>

          <div className="bg-slate-50 rounded-xl p-4 space-y-1">
            <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide">Derechos ARCO</p>
            <p className="text-slate-600">
              Tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus datos personales
              contactando al área administrativa de esta institución. Sus datos no serán compartidos con terceros salvo
              autorización expresa o mandato legal.
            </p>
          </div>

          <p className="text-slate-600">
            Sus datos se almacenarán de forma segura con cifrado de campos sensibles y acceso restringido al personal médico autorizado.
          </p>

          {/* Firmante */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="font-medium text-slate-800">¿Quién firma el consentimiento?</p>
            <div className="grid grid-cols-3 gap-2">
              {["PACIENTE", "TUTOR", "FAMILIAR"].map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFirmanteTipo(tipo)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    firmanteTipo === tipo
                      ? "bg-cyan-600 text-white border-cyan-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {tipo === "PACIENTE" ? "El paciente" : tipo === "TUTOR" ? "Tutor legal" : "Familiar"}
                </button>
              ))}
            </div>

            {firmanteTipo !== "PACIENTE" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre del firmante" required>
                  <input
                    value={firmanteNombre}
                    onChange={(e) => setFirmanteNombre(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre completo"
                  />
                </Field>
                <Field label="Relación con el paciente" required>
                  <input
                    value={firmanteRelacion}
                    onChange={(e) => setFirmanteRelacion(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Madre, Padre, Tutor…"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Accept checkbox */}
          <button
            type="button"
            onClick={() => setAccepted(!accepted)}
            className="flex items-start gap-3 w-full text-left py-3 px-4 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-colors"
          >
            {accepted
              ? <CheckSquare size={18} className="text-cyan-600 shrink-0 mt-0.5" />
              : <Square size={18} className="text-slate-400 shrink-0 mt-0.5" />}
            <span className="text-sm text-slate-700">
              He leído y acepto el aviso de privacidad. Autorizo el tratamiento de mis datos personales y de salud
              para los fines descritos anteriormente.
            </span>
          </button>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            disabled={!accepted || (firmanteTipo !== "PACIENTE" && (!firmanteNombre || !firmanteRelacion))}
            onClick={() => onAccept({ firmanteTipo, firmanteNombre, firmanteRelacion })}
            className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aceptar y continuar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NuevoPacientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [consentData, setConsentData] = useState<{ firmanteTipo: string; firmanteNombre: string; firmanteRelacion: string } | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const data = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value,
      apellidos: (form.elements.namedItem("apellidos") as HTMLInputElement).value,
      fechaNacimiento: (form.elements.namedItem("fechaNacimiento") as HTMLInputElement).value,
      sexo: (form.elements.namedItem("sexo") as HTMLSelectElement).value,
      curp: (form.elements.namedItem("curp") as HTMLInputElement).value,
      telefono: (form.elements.namedItem("telefono") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      direccion: (form.elements.namedItem("direccion") as HTMLInputElement).value,
      alergias: (form.elements.namedItem("alergias") as HTMLTextAreaElement).value,
      antecedentes: (form.elements.namedItem("antecedentes") as HTMLTextAreaElement).value,
      contactoEmergencia: (form.elements.namedItem("contactoEmergencia") as HTMLInputElement).value,
      telefonoEmergencia: (form.elements.namedItem("telefonoEmergencia") as HTMLInputElement).value,
    };

    // Show consent modal before creating
    setPendingData(data);
    setShowConsent(true);
  };

  const handleConsentAccepted = async (consent: { firmanteTipo: string; firmanteNombre: string; firmanteRelacion: string }) => {
    setConsentData(consent);
    setShowConsent(false);
    setLoading(true);

    // Create patient
    const res = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingData),
    });

    if (res.ok) {
      const paciente = await res.json();
      // Save consent
      await fetch(`/api/pacientes/${paciente.id}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aceptado: true,
          firmanteTipo: consent.firmanteTipo,
          firmanteNombre: consent.firmanteNombre,
          firmanteRelacion: consent.firmanteRelacion,
        }),
      });
      router.push("/dashboard/pacientes");
    } else {
      setError("Error al registrar paciente. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/dashboard/pacientes")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Pacientes
        </button>
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-slate-400" />
          <h1 className="text-lg font-bold text-slate-900">Nuevo paciente</h1>
        </div>
        <div className="w-24" />
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal info */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Datos personales</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" required>
                  <input name="nombre" required className={inputClass} placeholder="Juan" />
                </Field>
                <Field label="Apellidos" required>
                  <input name="apellidos" required className={inputClass} placeholder="García López" />
                </Field>
                <Field label="Fecha de nacimiento" required>
                  <input name="fechaNacimiento" type="date" required className={inputClass} />
                </Field>
                <Field label="Sexo" required>
                  <select name="sexo" required className={inputClass}>
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="CURP">
                    <input
                      name="curp"
                      className={inputClass}
                      placeholder="GAGL901230HMCRPN08"
                      maxLength={18}
                      style={{ textTransform: "uppercase" }}
                    />
                  </Field>
                  <p className="text-xs text-slate-400 mt-1">Se almacenará de forma cifrada</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Contacto</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <input name="telefono" type="tel" className={inputClass} placeholder="+52 55 1234 5678" />
                </Field>
                <Field label="Correo electrónico">
                  <input name="email" type="email" className={inputClass} placeholder="paciente@correo.com" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Dirección">
                  <input name="direccion" className={inputClass} placeholder="Calle, número, colonia, ciudad" />
                </Field>
              </div>
            </div>

            {/* Medical info */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Información médica</h2>
              <div className="space-y-4">
                <Field label="Alergias">
                  <textarea name="alergias" rows={2} className={inputClass} placeholder="Penicilina, látex, etc." />
                </Field>
                <Field label="Antecedentes médicos">
                  <textarea name="antecedentes" rows={3} className={inputClass} placeholder="Enfermedades previas, cirugías, tratamientos…" />
                </Field>
              </div>
            </div>

            {/* Emergency contact */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">Contacto de emergencia</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre">
                  <input name="contactoEmergencia" className={inputClass} placeholder="María García" />
                </Field>
                <Field label="Teléfono">
                  <input name="telefonoEmergencia" type="tel" className={inputClass} placeholder="+52 55 9876 5432" />
                </Field>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="bg-cyan-50 rounded-xl ring-1 ring-cyan-200 px-4 py-3 flex items-start gap-3">
              <ShieldCheck size={16} className="text-cyan-600 mt-0.5 shrink-0" />
              <p className="text-xs text-cyan-800">
                Al registrar este paciente, se mostrará el <strong>Aviso de Privacidad</strong> y se solicitará consentimiento informado
                conforme a la LFPDPPP y NOM-004-SSA3-2012.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg ring-1 ring-red-200">{error}</div>
            )}

            <div className="flex gap-3 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
              >
                <UserPlus size={15} />
                {loading ? "Guardando..." : "Continuar →"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/pacientes")}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {showConsent && (
        <ConsentModal
          onAccept={handleConsentAccepted}
          onCancel={() => { setShowConsent(false); setLoading(false); }}
        />
      )}
    </div>
  );
}
