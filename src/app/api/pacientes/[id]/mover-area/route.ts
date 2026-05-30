import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { pusherServer, isPusherConfigured } from "@/lib/pusher-server";

const ALLOWED = ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION", "URGENCIAS"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const body = await request.json();
    const { areaDestinoId, areaNombre, notas } = body;

    if (!areaNombre) return NextResponse.json({ error: "areaNombre requerido" }, { status: 400 });

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      select: { id: true, areaAsignada: true },
    });
    if (!paciente) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });

    // Find areaOrigen id if it exists
    const areaOrigen = paciente.areaAsignada
      ? await prisma.areaHospital.findFirst({ where: { nombre: paciente.areaAsignada } })
      : null;

    await prisma.$transaction([
      prisma.paciente.update({
        where: { id },
        data: { areaAsignada: areaNombre, asignadoEn: new Date() },
      }),
      prisma.movimientoPaciente.create({
        data: {
          pacienteId:    id,
          areaOrigenId:  areaOrigen?.id ?? null,
          areaDestinoId: areaDestinoId ?? undefined,
          areaOrigen:    paciente.areaAsignada ?? null,
          areaDestino:   areaNombre,
          realizadoPorId: userId,
          notas:         notas ?? null,
        },
      }),
    ]);

    // Notify real-time
    if (isPusherConfigured) {
      await pusherServer.trigger("areas-urgencias", "area-actualizada", {
        pacienteId: id, areaOrigen: paciente.areaAsignada, areaDestino: areaNombre,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al mover paciente" }, { status: 500 });
  }
}
