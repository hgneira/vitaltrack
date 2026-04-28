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
  const rol = (session.user as any).rol;
  if (!ROLES_PERMITIDOS.includes(rol)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;

  const registros = await prisma.signosVitales.findMany({
    where: { expedienteId: id },
    include: { registradoPor: { select: { nombre: true, apellidos: true } } },
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
  const rol = (session.user as any).rol;
  if (!ROLES_PERMITIDOS.includes(rol)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const userId = (session.user as any).id;

  const registro = await prisma.signosVitales.create({
    data: {
      expedienteId: id,
      turno: body.turno ?? "MATUTINO",
      temperatura: body.temperatura ?? null,
      frecuenciaCardiaca: body.frecuenciaCardiaca ?? null,
      frecuenciaRespiratoria: body.frecuenciaRespiratoria ?? null,
      presionSistolica: body.presionSistolica ?? null,
      presionDiastolica: body.presionDiastolica ?? null,
      spo2: body.spo2 ?? null,
      peso: body.peso ?? null,
      talla: body.talla ?? null,
      glucosa: body.glucosa ?? null,
      registradoPorId: userId,
    },
    include: { registradoPor: { select: { nombre: true, apellidos: true } } },
  });

  await logAuditoria({ userId, accion: "CREACION", expedienteId: id, detalle: "Signos vitales registrados" });

  return NextResponse.json(registro, { status: 201 });
}
