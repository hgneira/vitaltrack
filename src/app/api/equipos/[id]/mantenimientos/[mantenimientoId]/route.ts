import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; mantenimientoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, mantenimientoId } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    // Only update tecnico if a specific biomedico was selected.
    // Empty string means "unchanged" — don't overwrite the stored name.
    const tecnicoUpdate: { tecnico?: string | null } = {};
    if (body.tecnicoId) {
      const biomedico = await prisma.user.findUnique({
        where: { id: body.tecnicoId },
        select: { nombre: true, apellidos: true },
      });
      tecnicoUpdate.tecnico = biomedico
        ? `${biomedico.nombre}${biomedico.apellidos ? " " + biomedico.apellidos : ""}`
        : null;
    }

    const mantenimiento = await prisma.mantenimiento.update({
      where: { id: mantenimientoId },
      data: {
        tipo:                 body.tipo,
        fecha:                new Date(body.fecha),
        descripcion:          body.descripcion ?? null,
        ...tecnicoUpdate,
        costo:                body.costo ? Number(body.costo) : null,
        proximoMantenimiento: body.proximoMantenimiento ? new Date(body.proximoMantenimiento) : null,
      },
    });

    if (body.nuevoEstado) {
      await prisma.equipoMedico.update({
        where: { id },
        data: { estado: body.nuevoEstado },
      });
    }

    // Upsert TareaMantenimiento by mantenimientoOrigenId — ensures no duplicates (non-fatal)
    if (body.proximoMantenimiento) {
      try {
        await prisma.tareaMantenimiento.deleteMany({
          where: { mantenimientoOrigenId: mantenimientoId },
        });
        await prisma.tareaMantenimiento.create({
          data: {
            equipoId:              id,
            asignadoAId:           body.tecnicoId || null,
            asignadoPorId:         userId,
            fecha:                 new Date(body.proximoMantenimiento),
            tipo:                  body.tipo,
            descripcion:           `Mantenimiento programado (${body.recurrencia ?? "personalizado"})`,
            recurrencia:           body.recurrencia || null,
            mantenimientoOrigenId: mantenimientoId,
          },
        });
      } catch (e) {
        console.error("Error al crear TareaMantenimiento:", e);
      }
    }

    return NextResponse.json(mantenimiento);
  } catch {
    return NextResponse.json({ error: "Error al actualizar mantenimiento" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ mantenimientoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { mantenimientoId } = await params;

    await prisma.mantenimiento.delete({ where: { id: mantenimientoId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar mantenimiento" }, { status: 500 });
  }
}
