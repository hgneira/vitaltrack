import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const verificaciones = await prisma.verificacionAccesorios.findMany({
      where: { equipoId: id },
      include: {
        verificadoPor: { select: { nombre: true, apellidos: true } },
        items: { include: { accesorio: { select: { nombre: true } } } },
      },
      orderBy: { fecha: "desc" },
      take: 10,
    });
    return NextResponse.json(verificaciones);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    const verificacion = await prisma.verificacionAccesorios.create({
      data: {
        equipoId: id,
        verificadoPorId: userId,
        notas: body.notas ?? null,
        items: {
          create: (body.items as { accesorioId: string; presente: boolean }[]).map((item) => ({
            accesorioId: item.accesorioId,
            presente: item.presente,
          })),
        },
      },
      include: {
        verificadoPor: { select: { nombre: true, apellidos: true } },
        items: { include: { accesorio: { select: { nombre: true } } } },
      },
    });
    return NextResponse.json(verificacion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al guardar verificación" }, { status: 500 });
  }
}
