import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const pagos = await prisma.pago.findMany({
      where: userId ? { userId } : undefined,
      include: { user: { select: { id: true, nombre: true, apellidos: true, rol: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pagos);
  } catch {
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const pago = await prisma.pago.create({
      data: {
        userId: body.userId,
        periodo: body.periodo,
        monto: Number(body.monto),
        tipo: body.tipo ?? "SALARIO",
        descripcion: body.descripcion ?? null,
        fechaPago: body.fechaPago ? new Date(body.fechaPago) : null,
        pagado: body.pagado ?? false,
      },
    });
    return NextResponse.json(pago, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    await prisma.pago.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar pago" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const pago = await prisma.pago.update({
      where: { id: body.id },
      data: {
        pagado: body.pagado,
        fechaPago: body.fechaPago ? new Date(body.fechaPago) : new Date(),
      },
    });
    return NextResponse.json(pago);
  } catch {
    return NextResponse.json({ error: "Error al actualizar pago" }, { status: 500 });
  }
}
