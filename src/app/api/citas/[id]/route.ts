import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        fecha:      body.fecha      ? new Date(body.fecha) : undefined,
        motivo:     body.motivo     ?? null,
        notas:      body.notas      ?? null,
        estado:     body.estado     ?? undefined,
        pacienteId: body.pacienteId ?? undefined,
        medicoId:   body.medicoId   ?? undefined,
      },
      include: {
        paciente: { select: { nombre: true, apellidos: true } },
        medico:   { select: { nombre: true } },
      },
    });
    return NextResponse.json(cita);
  } catch {
    return NextResponse.json({ error: "Error al actualizar cita" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cita.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar cita" }, { status: 500 });
  }
}
