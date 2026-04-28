import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { encryptField } from "@/lib/crypto";
import { logAuditoria } from "@/lib/auditoria";

// Only medical staff can access patient records
const ROLES_PACIENTES = ["MEDICO", "ENFERMERIA", "RECEPCION", "ADMINISTRADOR", "URGENCIAS"];

function generarNumeroExpediente(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `EXP-${year}-${rand}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const rol    = (session.user as any).rol;

    if (!ROLES_PACIENTES.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    let pacientes;

    if (rol === "MEDICO") {
      pacientes = await prisma.paciente.findMany({
        where: {
          OR: [
            { medicoId: userId },
            { citas: { some: { medicoId: userId } } },
          ],
        },
        include: { consentimiento: { select: { aceptado: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else {
      pacientes = await prisma.paciente.findMany({
        include: { consentimiento: { select: { aceptado: true } } },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(pacientes);
  } catch {
    return NextResponse.json({ error: "Error al obtener pacientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const rol    = (session.user as any).rol;

    if (!ROLES_PACIENTES.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await request.json();

    // Generate unique expediente number
    let numeroExpediente = generarNumeroExpediente();
    // Ensure uniqueness (retry once on collision)
    const existing = await prisma.paciente.findUnique({ where: { numeroExpediente } });
    if (existing) numeroExpediente = generarNumeroExpediente();

    // Encrypt CURP if provided
    const curpRaw = body.curp?.trim() || null;
    const curpEncrypted = curpRaw ? encryptField(curpRaw.toUpperCase()) : null;

    const paciente = await prisma.paciente.create({
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        fechaNacimiento: new Date(body.fechaNacimiento),
        sexo: body.sexo,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        direccion: body.direccion ?? null,
        alergias: body.alergias ?? null,
        antecedentes: body.antecedentes ?? null,
        contactoEmergencia: body.contactoEmergencia ?? null,
        telefonoEmergencia: body.telefonoEmergencia ?? null,
        curp: curpEncrypted,
        numeroExpediente,
        medicoId: rol === "MEDICO" ? userId : null,
      },
    });

    await logAuditoria({
      userId,
      accion: "CREACION",
      pacienteId: paciente.id,
      detalle: `Paciente registrado: ${paciente.nombre} ${paciente.apellidos}`,
    });

    return NextResponse.json(paciente, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear paciente" }, { status: 500 });
  }
}
