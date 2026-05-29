import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "JEFE_BIOMEDICA", "URGENCIAS", "INGENIERIA_BIOMEDICA", "MANTENIMIENTO"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const equipo = await prisma.equipoMedico.findUnique({
      where: { id },
      include: { mantenimientos: { orderBy: { fecha: "desc" } } },
    });
    if (!equipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(equipo);
  } catch {
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch current ubicacion before update to detect changes
    const current = await prisma.equipoMedico.findUnique({ where: { id }, select: { ubicacion: true } });

    const equipo = await prisma.equipoMedico.update({
      where: { id },
      data: {
        nombre: body.nombre,
        marca: body.marca ?? null,
        modelo: body.modelo ?? null,
        numeroSerie: body.numeroSerie ?? null,
        fechaAdquisicion: body.fechaAdquisicion ? new Date(body.fechaAdquisicion) : null,
        ubicacion: body.ubicacion ?? null,
        estado: body.estado,
        descripcion: body.descripcion ?? null,
        ...(body.tagUid !== undefined ? { tagUid: body.tagUid || null } : {}),
      },
    });

    // If ubicacion changed, log a manual movement record
    const nuevaUbicacion = body.ubicacion ?? null;
    if (nuevaUbicacion && current && current.ubicacion !== nuevaUbicacion) {
      await prisma.registroRFID.create({
        data: {
          equipoId: id,
          readerId: "MANUAL",
          areaOrigen: current.ubicacion ?? undefined,
          areaDestino: nuevaUbicacion,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(equipo);
  } catch {
    return NextResponse.json({ error: "Error al actualizar equipo" }, { status: 500 });
  }
}
