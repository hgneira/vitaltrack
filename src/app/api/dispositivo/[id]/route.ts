import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const equipo = await prisma.equipoMedico.findUnique({
    where: { id },
    include: {
      mantenimientos: { orderBy: { fecha: "desc" }, take: 1 },
      acciones: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { nombre: true, apellidos: true, rol: true } } },
      },
    },
  });

  if (!equipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(equipo);
}
