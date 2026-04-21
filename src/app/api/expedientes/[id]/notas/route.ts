import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const nota = await prisma.notaSOAP.create({
      data: {
        expedienteId: id,
        creadoPorId: (session.user as any).id,
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

    return NextResponse.json(nota, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear nota" }, { status: 500 });
  }
}
