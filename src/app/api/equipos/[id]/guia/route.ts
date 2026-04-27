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
    const guia = await prisma.guiaRapida.findUnique({ where: { equipoId: id } });
    return NextResponse.json(guia ?? { pasos: [] });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !CAN_EDIT.includes((session.user as any).rol))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;
    const guia = await prisma.guiaRapida.upsert({
      where: { equipoId: id },
      create: { equipoId: id, pasos: body.pasos, updatedById: userId },
      update: { pasos: body.pasos, updatedById: userId },
    });
    return NextResponse.json(guia);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
