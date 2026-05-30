import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION", "URGENCIAS", "JEFE_BIOMEDICA", "INGENIERIA_BIOMEDICA", "MANTENIMIENTO"];
const ACTIVE_STATES = ["ESPERA", "ATENCION", "OBSERVACION", "EN_PROCESO", "ADMITIDO"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [areas, pacientes, equipos] = await Promise.all([
      prisma.areaHospital.findMany({
        where: { activo: true },
        orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      }),
      prisma.paciente.findMany({
        where: {
          areaAsignada: { not: null },
          OR: [
            { estadoAtencion: null },
            { estadoAtencion: { in: ACTIVE_STATES } },
          ],
        },
        select: { id: true, nombre: true, apellidos: true, areaAsignada: true, estadoAtencion: true, asignadoEn: true, createdAt: true },
      }),
      prisma.equipoMedico.findMany({
        where: { estado: "ACTIVO", ubicacion: { not: null } },
        select: { id: true, nombre: true, ubicacion: true, estado: true },
      }),
    ]);

    const result = areas.map((area) => {
      const pacientesArea = pacientes.filter((p) => p.areaAsignada === area.nombre);
      const equiposArea   = equipos.filter((e) => e.ubicacion === area.nombre);
      const ocupados      = pacientesArea.length;
      const maxCap        = area.capacidadMaxima ?? 0;
      const pct           = maxCap > 0 ? ocupados / maxCap : 0;
      const estado        = maxCap === 0 ? "sin_capacidad" : pct >= 1 ? "llena" : pct >= 0.8 ? "casi_llena" : "disponible";

      return {
        ...area,
        ocupados,
        equiposCount: equiposArea.length,
        estado,
        pct: Math.min(pct, 1),
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener ocupación" }, { status: 500 });
  }
}
