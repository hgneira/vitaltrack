import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "FARMACIA"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const medicamentos = await prisma.medicamento.findMany({
      where: { activo: true },
      include: {
        _count: { select: { movimientos: true } },
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(medicamentos);
  } catch {
    return NextResponse.json({ error: "Error al obtener medicamentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const medicamento = await prisma.medicamento.create({
      data: {
        nombre: body.nombre,
        principioActivo: body.principioActivo ?? null,
        presentacion: body.presentacion ?? null,
        concentracion: body.concentracion ?? null,
        stock: Number(body.stock ?? 0),
        stockMinimo: Number(body.stockMinimo ?? 5),
        unidad: body.unidad ?? null,
        precio: body.precio ? Number(body.precio) : null,
        ubicacion: body.ubicacion ?? null,
      },
    });
    return NextResponse.json(medicamento, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear medicamento" }, { status: 500 });
  }
}
