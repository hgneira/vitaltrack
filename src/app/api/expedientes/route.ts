import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/expedientes?pacienteId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get("pacienteId");
    if (!pacienteId) return NextResponse.json({ error: "pacienteId requerido" }, { status: 400 });

    const expediente = await prisma.expediente.findUnique({
      where: { pacienteId },
      include: {
        medico: { select: { nombre: true, apellidos: true } },
        notas: {
          include: { creadoPor: { select: { nombre: true, apellidos: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(expediente ?? null);
  } catch {
    return NextResponse.json({ error: "Error al obtener expediente" }, { status: 500 });
  }
}

// POST /api/expedientes  — creates the expediente for a patient
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const medicoId = (session.user as any).id;

    const expediente = await prisma.expediente.create({
      data: {
        pacienteId: body.pacienteId,
        medicoId,
      },
      include: {
        medico: { select: { nombre: true, apellidos: true } },
        notas: true,
      },
    });

    return NextResponse.json(expediente, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "El paciente ya tiene un expediente" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear expediente" }, { status: 500 });
  }
}
