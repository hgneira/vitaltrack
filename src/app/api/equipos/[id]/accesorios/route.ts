import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "URGENCIAS"];
const CAN_EDIT = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const accesorios = await prisma.accesorioEquipo.findMany({
      where: { equipoId: id },
      orderBy: { orden: "asc" },
    });
    return NextResponse.json(accesorios);
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
    const count = await prisma.accesorioEquipo.count({ where: { equipoId: id } });
    const acc = await prisma.accesorioEquipo.create({
      data: { equipoId: id, nombre: body.nombre, requerido: body.requerido ?? true, orden: count },
    });
    return NextResponse.json(acc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
