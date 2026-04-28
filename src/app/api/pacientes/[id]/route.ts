import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { encryptField, decryptField } from "@/lib/crypto";
import { logAuditoria } from "@/lib/auditoria";

const ROLES_LECTURA = ["MEDICO", "ENFERMERIA", "RECEPCION", "ADMINISTRADOR"];
const ROLES_ESCRITURA = ["MEDICO", "RECEPCION", "ADMINISTRADOR"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as any).rol;
    if (!ROLES_LECTURA.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: { consentimiento: true },
    });
    if (!paciente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await logAuditoria({
      userId: (session.user as any).id,
      accion: "ACCESO",
      pacienteId: id,
      detalle: "Datos del paciente consultados",
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      ...paciente,
      curp: paciente.curp ? decryptField(paciente.curp) : null,
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener paciente" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as any).rol;
    if (!ROLES_ESCRITURA.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    const curpRaw = body.curp?.trim() || null;

    const paciente = await prisma.paciente.update({
      where: { id },
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos,
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : undefined,
        sexo: body.sexo,
        telefono: body.telefono || null,
        email: body.email || null,
        direccion: body.direccion || null,
        alergias: body.alergias || null,
        antecedentes: body.antecedentes || null,
        contactoEmergencia: body.contactoEmergencia || null,
        telefonoEmergencia: body.telefonoEmergencia || null,
        curp: curpRaw ? encryptField(curpRaw.toUpperCase()) : undefined,
      },
    });

    await logAuditoria({ userId, accion: "MODIFICACION", pacienteId: id, detalle: "Datos del paciente actualizados" });

    return NextResponse.json(paciente);
  } catch {
    return NextResponse.json({ error: "Error al actualizar paciente" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;

    // Delete in order to respect FK constraints
    const expediente = await prisma.expediente.findUnique({ where: { pacienteId: id } });
    if (expediente) {
      await prisma.notaSOAP.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.signosVitales.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.medicamentoAdministrado.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.interconsulta.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.dispositivoUtilizado.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.expediente.delete({ where: { id: expediente.id } });
    }
    await prisma.cita.deleteMany({ where: { pacienteId: id } });
    await prisma.paciente.delete({ where: { id } });

    await logAuditoria({ userId, accion: "ELIMINACION", pacienteId: id, detalle: "Paciente eliminado" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar paciente" }, { status: 500 });
  }
}
