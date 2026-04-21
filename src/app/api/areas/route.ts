import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const areas = await prisma.areaHospital.findMany({
      where: { activo: true },
      include: {
        registros: {
          orderBy: { fecha: "desc" },
          take: 1,
          include: { user: { select: { nombre: true } } },
        },
        _count: { select: { alertas: true, registros: true } },
      },
      orderBy: [{ piso: "asc" }, { nombre: "asc" }],
    });
    return NextResponse.json(areas);
  } catch {
    return NextResponse.json({ error: "Error al obtener áreas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const area = await prisma.areaHospital.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        piso: body.piso ?? null,
        tipo: body.tipo ?? "OTRO",
      },
    });
    return NextResponse.json(area, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear área" }, { status: 500 });
  }
}
