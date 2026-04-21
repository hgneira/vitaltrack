import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "FARMACIA"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const movimientos = await prisma.movimientoMedicamento.findMany({
      where: { medicamentoId: id },
      include: { user: { select: { nombre: true, apellidos: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(movimientos);
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
    const cantidad = Number(body.cantidad);

    // Update stock atomically
    const medicamento = await prisma.medicamento.findUnique({ where: { id } });
    if (!medicamento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const delta =
      body.tipo === "ENTRADA" ? cantidad :
      body.tipo === "SALIDA" ? -cantidad :
      cantidad; // AJUSTE — can be positive or negative

    const nuevoStock = medicamento.stock + delta;
    if (nuevoStock < 0) {
      return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
    }

    const [movimiento] = await prisma.$transaction([
      prisma.movimientoMedicamento.create({
        data: {
          medicamentoId: id,
          tipo: body.tipo,
          cantidad,
          precio: body.precio ? Number(body.precio) : null,
          motivo: body.motivo ?? null,
          pacienteNombre: body.pacienteNombre ?? null,
          userId: (session.user as any).id,
        },
        include: { user: { select: { nombre: true } } },
      }),
      prisma.medicamento.update({
        where: { id },
        data: { stock: nuevoStock },
      }),
    ]);

    return NextResponse.json(movimiento, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}
