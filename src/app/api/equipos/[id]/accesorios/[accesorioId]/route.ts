import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const CAN_EDIT = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; accesorioId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !CAN_EDIT.includes((session.user as any).rol))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { accesorioId } = await params;
    await prisma.accesorioEquipo.delete({ where: { id: accesorioId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
