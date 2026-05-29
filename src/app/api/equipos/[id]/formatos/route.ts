import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "JEFE_BIOMEDICA", "URGENCIAS", "INGENIERIA_BIOMEDICA", "MANTENIMIENTO"];

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const formatos = await prisma.formatoRegistro.findMany({
      where: { equipoId: id },
      include: { creadoPor: { select: { nombre: true, apellidos: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(formatos);
  } catch {
    return NextResponse.json({ error: "Error al obtener formatos" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    const equipo = await prisma.equipoMedico.findUnique({
      where: { id },
      select: { nombre: true, ubicacion: true },
    });

    const formato = await prisma.formatoRegistro.create({
      data: {
        equipoId: id,
        tipo: body.tipo,
        datos: JSON.stringify(body.datos),
        creadoPorId: userId,
      },
    });

    // If baja, update equipo estado
    if (body.tipo === "BAJA") {
      await prisma.equipoMedico.update({
        where: { id },
        data: { estado: "DADO_DE_BAJA" },
      });
    }

    // If orden de servicio, create alert for biomedica & mantenimiento
    if (body.tipo === "SERVICIO") {
      const folio = body.datos?.folio ? ` — Folio: ${body.datos.folio}` : "";
      const ubicacion = equipo?.ubicacion ? ` (${equipo.ubicacion})` : "";
      await prisma.alerta.create({
        data: {
          titulo: `Orden de servicio: ${equipo?.nombre ?? id}`,
          descripcion: `Se generó una orden de servicio para ${equipo?.nombre ?? "equipo"}${ubicacion}${folio}. Requiere atención del área de ingeniería biomédica.`,
          tipo: "MANTENIMIENTO",
          prioridad: "ALTA",
          creadaPorId: userId,
        },
      });
    }

    return NextResponse.json(formato, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al guardar formato" }, { status: 500 });
  }
}
