import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// All authenticated users can fetch the area catalog
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const simple = searchParams.get("simple") === "1";

    if (simple) {
      const areas = await prisma.areaHospital.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, categoria: true, capacidad: true },
        orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      });
      return NextResponse.json(areas);
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
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
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
        nombre:    body.nombre,
        descripcion: body.descripcion ?? null,
        piso:      body.piso ?? null,
        categoria: body.categoria ?? null,
        capacidad: body.capacidad ?? null,
        tipo:      body.tipo ?? "OTRO",
      },
    });
    return NextResponse.json(area, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear área" }, { status: 500 });
  }
}
