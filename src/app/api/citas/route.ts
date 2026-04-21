import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const rol    = (session.user as any).rol;

    const where = rol === "MEDICO" ? { medicoId: userId } : {};

    const citas = await prisma.cita.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        paciente: { select: { nombre: true, apellidos: true } },
        medico:   { select: { nombre: true, apellidos: true, titulo: true } },
      },
    });

    return NextResponse.json(citas);
  } catch {
    return NextResponse.json({ error: "Error al obtener citas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cita = await prisma.cita.create({
      data: {
        fecha: new Date(body.fecha),
        motivo: body.motivo,
        estado: "PROGRAMADA",
        pacienteId: body.pacienteId,
        medicoId: body.medicoId,
      },
    });
    return NextResponse.json(cita, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear cita" }, { status: 500 });
  }
}
