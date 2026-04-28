import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/auditoria";

const ROLES_PERMITIDOS = ["MEDICO", "ENFERMERIA"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ROLES_PERMITIDOS.includes((session.user as any).rol))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const registros = await prisma.medicamentoAdministrado.findMany({
    where: { expedienteId: id },
    include: { indicadoPor: { select: { nombre: true, apellidos: true } } },
    orderBy: { fecha: "desc" },
  });
  return NextResponse.json(registros);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ROLES_PERMITIDOS.includes((session.user as any).rol))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const userId = (session.user as any).id;

  const registro = await prisma.medicamentoAdministrado.create({
    data: {
      expedienteId: id,
      medicamento: body.medicamento,
      dosis: body.dosis ?? null,
      via: body.via ?? null,
      frecuencia: body.frecuencia ?? null,
      indicadoPorNombre: body.indicadoPorNombre ?? null,
      indicadoPorId: userId,
    },
    include: { indicadoPor: { select: { nombre: true, apellidos: true } } },
  });

  await logAuditoria({ userId, accion: "CREACION", expedienteId: id, detalle: `Medicamento: ${body.medicamento}` });

  return NextResponse.json(registro, { status: 201 });
}
