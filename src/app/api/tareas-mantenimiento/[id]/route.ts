import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    const tarea = await prisma.tareaMantenimiento.update({
      where: { id },
      data: {
        ...(body.equipoId    !== undefined && { equipoId:    body.equipoId }),
        ...(body.asignadoAId !== undefined && { asignadoAId: body.asignadoAId || null }),
        ...(body.fecha       !== undefined && { fecha:       new Date(body.fecha) }),
        ...(body.tipo        !== undefined && { tipo:        body.tipo }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
        ...(body.estado      !== undefined && { estado:      body.estado }),
        ...(body.recurrencia !== undefined && { recurrencia: body.recurrencia || null }),
      },
      include: {
        equipo:     { select: { id: true, nombre: true } },
        asignadoA:  { select: { id: true, nombre: true, apellidos: true } },
      },
    });
    return NextResponse.json(tarea);
  } catch {
    return NextResponse.json({ error: "Error al actualizar tarea" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMINISTRADOR", "JEFE_BIOMEDICA"].includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.tareaMantenimiento.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar tarea" }, { status: 500 });
  }
}
