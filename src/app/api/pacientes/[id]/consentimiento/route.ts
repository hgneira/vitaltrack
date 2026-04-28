import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const consentimiento = await prisma.consentimientoInformado.findUnique({
    where: { pacienteId: id },
  });
  return NextResponse.json(consentimiento);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const userId = (session.user as any).id;

  const consentimiento = await prisma.consentimientoInformado.upsert({
    where: { pacienteId: id },
    update: {
      aceptado: body.aceptado,
      fechaAceptacion: body.aceptado ? new Date() : null,
      registradoPorId: userId,
      firmanteTipo: body.firmanteTipo ?? "PACIENTE",
      firmanteNombre: body.firmanteNombre ?? null,
      firmanteRelacion: body.firmanteRelacion ?? null,
    },
    create: {
      pacienteId: id,
      aceptado: body.aceptado,
      fechaAceptacion: body.aceptado ? new Date() : null,
      registradoPorId: userId,
      firmanteTipo: body.firmanteTipo ?? "PACIENTE",
      firmanteNombre: body.firmanteNombre ?? null,
      firmanteRelacion: body.firmanteRelacion ?? null,
    },
  });

  return NextResponse.json(consentimiento, { status: 201 });
}
