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
  const registros = await prisma.dispositivoUtilizado.findMany({
    where: { expedienteId: id },
    include: { equipo: { select: { nombre: true, modelo: true, ubicacion: true } } },
    orderBy: { inicio: "desc" },
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

  const registro = await prisma.dispositivoUtilizado.create({
    data: {
      expedienteId: id,
      equipoId: body.equipoId,
      notas: body.notas ?? null,
    },
    include: { equipo: { select: { nombre: true, modelo: true, ubicacion: true } } },
  });

  await logAuditoria({ userId, accion: "CREACION", expedienteId: id, detalle: `Dispositivo vinculado: ${body.equipoId}` });

  return NextResponse.json(registro, { status: 201 });
}

export async function PATCH(
  request: Request,
  _ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ROLES_PERMITIDOS.includes((session.user as any).rol))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json();
  const registro = await prisma.dispositivoUtilizado.update({
    where: { id: body.dispositivoId },
    data: { fin: new Date() },
  });

  return NextResponse.json(registro);
}
