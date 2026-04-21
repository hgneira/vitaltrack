import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");

    const alertas = await prisma.alerta.findMany({
      where: estado ? { estado: estado as any } : undefined,
      include: {
        area: { select: { nombre: true } },
        creadaPor: { select: { nombre: true, apellidos: true, rol: true } },
        asignadaA: { select: { nombre: true, apellidos: true } },
      },
      orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(alertas);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const alerta = await prisma.alerta.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion ?? null,
        areaId: body.areaId ?? null,
        tipo: body.tipo ?? "LIMPIEZA",
        prioridad: body.prioridad ?? "MEDIA",
        creadaPorId: (session.user as any).id,
      },
      include: {
        area: { select: { nombre: true } },
        creadaPor: { select: { nombre: true, rol: true } },
      },
    });
    return NextResponse.json(alerta, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear alerta" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const rol = (session?.user as any)?.rol;
    if (!session || !["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const alerta = await prisma.alerta.update({
      where: { id: body.id },
      data: {
        estado: body.estado,
        resueltaEn: body.estado === "RESUELTA" ? new Date() : null,
      },
    });
    return NextResponse.json(alerta);
  } catch {
    return NextResponse.json({ error: "Error al actualizar alerta" }, { status: 500 });
  }
}
