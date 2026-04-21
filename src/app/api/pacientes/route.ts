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

    let pacientes;

    if (rol === "MEDICO") {
      // Pacientes registrados por este médico, O con citas asignadas a él
      pacientes = await prisma.paciente.findMany({
        where: {
          OR: [
            { medicoId: userId },
            { citas: { some: { medicoId: userId } } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      pacientes = await prisma.paciente.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(pacientes);
  } catch {
    return NextResponse.json({ error: "Error al obtener pacientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const rol    = (session.user as any).rol;

    const body = await request.json();
    const paciente = await prisma.paciente.create({
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        fechaNacimiento: new Date(body.fechaNacimiento),
        sexo: body.sexo,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        direccion: body.direccion ?? null,
        alergias: body.alergias ?? null,
        antecedentes: body.antecedentes ?? null,
        contactoEmergencia: body.contactoEmergencia ?? null,
        telefonoEmergencia: body.telefonoEmergencia ?? null,
        // Si lo registra un médico, queda vinculado a él
        medicoId: rol === "MEDICO" ? userId : null,
      },
    });
    return NextResponse.json(paciente, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear paciente" }, { status: 500 });
  }
}
