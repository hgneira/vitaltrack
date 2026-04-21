import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const medicos = await prisma.user.findMany({
      where: { rol: "MEDICO" },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        titulo: true,
        email: true,
        especialidad: true,
        subespecialidad: true,
        telefono: true,
        escuela: true,
        cedulaProfesional: true,
        foto: true,
        activo: true,
        _count: {
          select: {
            citas: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    // Get unique patient count per doctor
    const medicosConPacientes = await Promise.all(
      medicos.map(async (m: (typeof medicos)[0]) => {
        const pacientesUnicos = await prisma.cita.findMany({
          where: { medicoId: m.id },
          select: { pacienteId: true },
          distinct: ["pacienteId"],
        });
        return { ...m, pacientesCount: pacientesUnicos.length };
      })
    );

    return NextResponse.json(medicosConPacientes);
  } catch {
    return NextResponse.json({ error: "Error al obtener médicos" }, { status: 500 });
  }
}
