import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/auditoria";

const ROLES_PERMITIDOS = ["MEDICO", "ENFERMERIA", "URGENCIAS"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ROLES_PERMITIDOS.includes((session.user as any).rol))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const registros = await prisma.interconsulta.findMany({
    where: { expedienteId: id },
    include: { solicitadoPor: { select: { nombre: true, apellidos: true } } },
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

  const registro = await prisma.interconsulta.create({
    data: {
      expedienteId: id,
      especialidad: body.especialidad,
      motivo: body.motivo ?? null,
      respuesta: body.respuesta ?? null,
      solicitadoPorId: userId,
    },
    include: { solicitadoPor: { select: { nombre: true, apellidos: true } } },
  });

  await logAuditoria({ userId, accion: "CREACION", expedienteId: id, detalle: `Interconsulta: ${body.especialidad}` });

  return NextResponse.json(registro, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ROLES_PERMITIDOS.includes((session.user as any).rol))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json();
  const { id: _expId } = await params;

  const registro = await prisma.interconsulta.update({
    where: { id: body.interconsultaId },
    data: { respuesta: body.respuesta },
  });

  return NextResponse.json(registro);
}
