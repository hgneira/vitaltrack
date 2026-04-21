import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "URGENCIAS"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const equipos = await prisma.equipoMedico.findMany({
      include: {
        mantenimientos: { orderBy: { fecha: "desc" } },
        _count: { select: { mantenimientos: true } },
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(equipos);
  } catch {
    return NextResponse.json({ error: "Error al obtener equipos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const equipo = await prisma.equipoMedico.create({
      data: {
        nombre: body.nombre,
        marca: body.marca ?? null,
        modelo: body.modelo ?? null,
        numeroSerie: body.numeroSerie ?? null,
        fechaAdquisicion: body.fechaAdquisicion ? new Date(body.fechaAdquisicion) : null,
        ubicacion: body.ubicacion ?? null,
        estado: body.estado ?? "ACTIVO",
        descripcion: body.descripcion ?? null,
      },
    });
    return NextResponse.json(equipo, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "El número de serie ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear equipo" }, { status: 500 });
  }
}
