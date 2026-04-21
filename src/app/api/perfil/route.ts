import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nombre: true, apellidos: true, titulo: true, email: true,
        especialidad: true, subespecialidad: true, telefono: true, escuela: true,
        cedulaProfesional: true, foto: true, rol: true,
      },
    });

    if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await req.json();

    const { nombre, apellidos, titulo, especialidad, subespecialidad, telefono, escuela, cedulaProfesional, foto } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nombre            !== undefined && { nombre }),
        ...(apellidos         !== undefined && { apellidos }),
        ...(titulo            !== undefined && { titulo }),
        ...(especialidad      !== undefined && { especialidad }),
        ...(subespecialidad   !== undefined && { subespecialidad }),
        ...(telefono          !== undefined && { telefono }),
        ...(escuela           !== undefined && { escuela }),
        ...(cedulaProfesional !== undefined && { cedulaProfesional }),
        ...(foto              !== undefined && { foto }),
      },
      select: {
        id: true, nombre: true, apellidos: true, titulo: true, email: true,
        especialidad: true, subespecialidad: true, telefono: true, escuela: true,
        cedulaProfesional: true, foto: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
