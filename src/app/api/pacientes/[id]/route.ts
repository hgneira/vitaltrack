import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paciente = await prisma.paciente.findUnique({ where: { id } });
    if (!paciente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(paciente);
  } catch {
    return NextResponse.json({ error: "Error al obtener paciente" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const paciente = await prisma.paciente.update({
      where: { id },
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : undefined,
        sexo: body.sexo,
        telefono: body.telefono || null,
        email: body.email || null,
        direccion: body.direccion || null,
        alergias: body.alergias || null,
        antecedentes: body.antecedentes || null,
        contactoEmergencia: body.contactoEmergencia || null,
        telefonoEmergencia: body.telefonoEmergencia || null,
      },
    });
    return NextResponse.json(paciente);
  } catch {
    return NextResponse.json({ error: "Error al actualizar paciente" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete in order to respect FK constraints
    const expediente = await prisma.expediente.findUnique({ where: { pacienteId: id } });
    if (expediente) {
      await prisma.notaSOAP.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.expediente.delete({ where: { id: expediente.id } });
    }
    await prisma.cita.deleteMany({ where: { pacienteId: id } });
    await prisma.paciente.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar paciente" }, { status: 500 });
  }
}
