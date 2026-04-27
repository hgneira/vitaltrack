import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const CAN_EDIT = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const docs = await prisma.documentoEquipo.findMany({
      where: { equipoId: id },
      include: { subidoPor: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !CAN_EDIT.includes((session.user as any).rol))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;
    const doc = await prisma.documentoEquipo.create({
      data: { equipoId: id, tipo: body.tipo, nombre: body.nombre, url: body.url, subidoPorId: userId },
      include: { subidoPor: { select: { nombre: true } } },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
