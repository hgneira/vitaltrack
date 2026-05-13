import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const CAN_UPLOAD = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const normativas = await prisma.normativa.findMany({
      include: { subidoPor: { select: { nombre: true, apellidos: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(normativas);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !CAN_UPLOAD.includes((session.user as any).rol))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const body = await request.json();
    const userId = (session.user as any).id;
    const normativa = await prisma.normativa.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        categoria: body.categoria || null,
        url: body.url,
        subidoPorId: userId,
      },
      include: { subidoPor: { select: { nombre: true, apellidos: true } } },
    });
    return NextResponse.json(normativa, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
