import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const userId = (session.user as any).id;
    const rol = (session.user as any).rol;

    const tareas = await prisma.tareaMantenimiento.findMany({
      where: rol === "INGENIERIA_BIOMEDICA"
        ? { OR: [{ asignadoAId: userId }, { asignadoAId: null }] }
        : {},
      include: {
        equipo: { select: { id: true, nombre: true, ubicacion: true } },
        asignadoA: { select: { id: true, nombre: true, apellidos: true } },
        asignadoPor: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { fecha: "asc" },
    });
    return NextResponse.json(tareas);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMINISTRADOR", "JEFE_BIOMEDICA"].includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await request.json();
    const asignadoPorId = (session.user as any).id;

    const tarea = await prisma.tareaMantenimiento.create({
      data: {
        equipoId:      body.equipoId,
        asignadoAId:   body.asignadoAId || null,
        asignadoPorId,
        fecha:         new Date(body.fecha),
        tipo:          body.tipo ?? "PREVENTIVO",
        descripcion:   body.descripcion ?? null,
        recurrencia:   body.recurrencia ?? null,
      },
      include: {
        equipo: { select: { id: true, nombre: true, ubicacion: true } },
        asignadoA: { select: { id: true, nombre: true, apellidos: true } },
      },
    });
    return NextResponse.json(tarea, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear tarea" }, { status: 500 });
  }
}
