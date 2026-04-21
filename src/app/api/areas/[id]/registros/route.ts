import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const registros = await prisma.registroLimpieza.findMany({
      where: { areaId: id },
      include: {
        user: { select: { nombre: true, apellidos: true } },
        area: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(registros);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const registro = await prisma.registroLimpieza.create({
      data: {
        areaId: id,
        userId: (session.user as any).id,
        tipo: body.tipo ?? "LIMPIEZA",
        descripcion: body.descripcion ?? null,
      },
      include: {
        user: { select: { nombre: true, apellidos: true } },
        area: { select: { nombre: true } },
      },
    });
    return NextResponse.json(registro, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
