import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION", "URGENCIAS", "JEFE_BIOMEDICA", "INGENIERIA_BIOMEDICA", "MANTENIMIENTO"];
const EXCLUDED_STATES = ["ALTA"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const area = await prisma.areaHospital.findUnique({ where: { id } });
    if (!area) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const [pacientes, equipos, movimientos] = await Promise.all([
      prisma.paciente.findMany({
        where: {
          areaAsignada: area.nombre,
          NOT: { estadoAtencion: { in: EXCLUDED_STATES } },
        },
        select: {
          id: true, nombre: true, apellidos: true, numeroExpediente: true,
          estadoAtencion: true, asignadoEn: true, createdAt: true, motivoConsulta: true,
        },
        orderBy: { asignadoEn: "asc" },
      }),
      prisma.equipoMedico.findMany({
        where: { ubicacion: area.nombre },
        select: { id: true, nombre: true, estado: true, marca: true, modelo: true, numeroSerie: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.movimientoPaciente.findMany({
        where: { areaDestino: area.nombre },
        include: { realizadoPor: { select: { nombre: true, apellidos: true, rol: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ area, pacientes, equipos, movimientos });
  } catch {
    return NextResponse.json({ error: "Error al obtener detalles" }, { status: 500 });
  }
}
