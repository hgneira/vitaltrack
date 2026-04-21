import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const medico = await prisma.user.findUnique({
      where: { id, rol: "MEDICO" },
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
        createdAt: true,
      },
    });

    if (!medico) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Unique patients of this doctor
    const citasRaw = await prisma.cita.findMany({
      where: { medicoId: id },
      include: {
        paciente: {
          select: {
            id: true, nombre: true, apellidos: true,
            fechaNacimiento: true, sexo: true, telefono: true,
            alergias: true, antecedentes: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Deduplicate patients
    const pacienteMap = new Map<string, (typeof citasRaw)[0]["paciente"]>();
    for (const c of citasRaw) {
      if (!pacienteMap.has(c.pacienteId)) pacienteMap.set(c.pacienteId, c.paciente);
    }
    const pacientes = Array.from(pacienteMap.values()).sort((a, b) =>
      `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`)
    );

    const citas = citasRaw.map((c) => ({
      id: c.id,
      fecha: c.fecha,
      motivo: c.motivo,
      estado: c.estado,
      notas: c.notas,
      paciente: { id: c.paciente.id, nombre: c.paciente.nombre, apellidos: c.paciente.apellidos },
    }));

    return NextResponse.json({ medico, pacientes, citas });
  } catch {
    return NextResponse.json({ error: "Error al obtener médico" }, { status: 500 });
  }
}
