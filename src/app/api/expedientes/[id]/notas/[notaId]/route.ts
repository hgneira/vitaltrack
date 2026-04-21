import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; notaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { notaId } = await params;
    const body = await request.json();

    const nota = await prisma.notaSOAP.update({
      where: { id: notaId },
      data: {
        subjetivo: body.subjetivo || null,
        objetivo: body.objetivo || null,
        analisis: body.analisis || null,
        plan: body.plan || null,
        diagnostico: body.diagnostico || null,
        tratamiento: body.tratamiento || null,
        evolucion: body.evolucion || null,
      },
      include: {
        creadoPor: { select: { nombre: true, apellidos: true } },
      },
    });

    return NextResponse.json(nota);
  } catch {
    return NextResponse.json({ error: "Error al actualizar nota" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; notaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { notaId } = await params;
    await prisma.notaSOAP.delete({ where: { id: notaId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar nota" }, { status: 500 });
  }
}
