import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/auditoria";

const ROLES_PERMITIDOS = ["MEDICO", "ENFERMERIA", "URGENCIAS"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; notaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as any).rol;
    if (!ROLES_PERMITIDOS.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { id, notaId } = await params;
    const body = await request.json();

    const nota = await prisma.notaSOAP.update({
      where: { id: notaId },
      data: {
        subjetivo: body.subjetivo || null,
        objetivo: body.objetivo || null,
        analisis: body.analisis || null,
        plan: body.plan || null,
        diagnostico: body.diagnostico || null,
        tratamiento: body.tratamiento || null,
        evolucion: body.evolucion || null,
      },
      include: { creadoPor: { select: { nombre: true, apellidos: true } } },
    });

    await logAuditoria({ userId: (session.user as any).id, accion: "MODIFICACION", expedienteId: id, detalle: `Nota SOAP modificada: ${notaId}` });

    return NextResponse.json(nota);
  } catch {
    return NextResponse.json({ error: "Error al actualizar nota" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; notaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as any).rol;
    if (!ROLES_PERMITIDOS.includes(rol))
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { id, notaId } = await params;
    await prisma.notaSOAP.delete({ where: { id: notaId } });

    await logAuditoria({ userId: (session.user as any).id, accion: "ELIMINACION", expedienteId: id, detalle: `Nota SOAP eliminada: ${notaId}` });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar nota" }, { status: 500 });
  }
}
