import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.apellidos !== undefined) data.apellidos = body.apellidos;
    if (body.titulo !== undefined) data.titulo = body.titulo;
    if (body.email !== undefined) data.email = body.email;
    if (body.rol !== undefined) data.rol = body.rol;
    if (body.especialidad !== undefined) data.especialidad = body.especialidad;
    if (body.telefono !== undefined) data.telefono = body.telefono;
    if (body.activo !== undefined) data.activo = body.activo;

    if (body.password) {
      const bcrypt = await import("bcryptjs");
      data.password = await bcrypt.hash(body.password, 12);
    }

    const usuario = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        rol: true,
        activo: true,
        especialidad: true,
        telefono: true,
      },
    });
    return NextResponse.json(usuario);
  } catch {
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    // Cascade-delete related records before removing the user
    await prisma.asistencia.deleteMany({ where: { userId: id } });
    await prisma.horarioTrabajo.deleteMany({ where: { userId: id } });
    await prisma.pago.deleteMany({ where: { userId: id } });
    await prisma.registroLimpieza.deleteMany({ where: { userId: id } });
    await prisma.movimientoMedicamento.deleteMany({ where: { userId: id } });
    // Nullify alert assignments; delete alerts created by this user
    await prisma.alerta.updateMany({ where: { asignadaAId: id }, data: { asignadaAId: null } });
    await prisma.alerta.deleteMany({ where: { creadaPorId: id } });
    // Nullify biomedical task assignments; delete tasks created by this user
    await prisma.tareaMantenimiento.updateMany({ where: { asignadoAId: id }, data: { asignadoAId: null } });
    await prisma.tareaMantenimiento.deleteMany({ where: { asignadoPorId: id } });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2003" || error?.code === "P2014") {
      return NextResponse.json(
        { error: "No se puede eliminar: el usuario tiene registros médicos asociados (citas, expedientes)." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
