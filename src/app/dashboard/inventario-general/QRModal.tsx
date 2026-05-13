"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Smartphone } from "lucide-react";

interface Props {
  equipo: { id: string; nombre: string; marca?: string; numeroSerie?: string; ubicacion?: string };
  onClose: () => void;
}

export default function QRModal({ equipo, onClose }: Props) {
  const [origin, setOrigin] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/dashboard/dispositivo/${equipo.id}`;

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${equipo.nombre}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
            .card { text-align: center; padding: 24px; border: 2px solid #e2e8f0; border-radius: 16px; max-width: 320px; width: 100%; }
            .logo { font-size: 18px; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
            .logo span { color: #38c5f0; }
            .subtitle { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; }
            .qr-wrap { display: flex; justify-content: center; margin-bottom: 14px; }
            .name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 2px; }
            .serial { font-size: 10px; font-family: monospace; color: #94a3b8; background: #f8fafc; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
            .url { font-size: 8px; color: #cbd5e1; margin-top: 10px; word-break: break-all; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Código QR del dispositivo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Hidden print-only content */}
        <div ref={printRef} className="hidden">
          <div className="card">
            <div className="logo">Vital<span>Track</span></div>
            <div className="subtitle">Medical Device Tracking</div>
            <div className="qr-wrap">
              {origin && (
                <QRCodeSVG
                  value={url}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>
            <div className="name">{equipo.nombre}</div>
            {equipo.marca && <div className="meta">{equipo.marca}</div>}
            {equipo.ubicacion && <div className="meta">{equipo.ubicacion}</div>}
            {equipo.numeroSerie && <div className="serial">{equipo.numeroSerie}</div>}
            <div className="url">{url}</div>
          </div>
        </div>

        {/* Clean screen preview */}
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Device name */}
          <p className="text-base font-bold text-slate-900 text-center">{equipo.nombre}</p>

          {/* QR code */}
          {origin && (
            <div className="flex justify-center">
              <QRCodeSVG
                value={url}
                size={200}
                level="M"
                includeMargin={true}
                style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}
              />
            </div>
          )}

          {/* Device info */}
          <div className="text-center space-y-1">
            {equipo.marca && (
              <p className="text-sm text-slate-500">{equipo.marca}</p>
            )}
            {equipo.ubicacion && (
              <p className="text-sm text-slate-500">{equipo.ubicacion}</p>
            )}
            {equipo.numeroSerie && (
              <p className="text-xs font-mono text-slate-400 bg-slate-50 inline-block px-2 py-0.5 rounded">{equipo.numeroSerie}</p>
            )}
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1 justify-center">
            <Smartphone size={12} />
            Escanea para abrir la ficha en el celular
          </p>

          <p className="text-xs text-slate-300 break-all font-mono text-center">{url}</p>

          {/* Print button */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Printer size={15} /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
