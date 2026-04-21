import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA", "URGENCIAS"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const mantenimientos = await prisma.mantenimiento.findMany({
      where: { equipoId: id },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(mantenimientos);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    // If tecnicoId provided, look up their name
    let tecnicoNombre: string | null = body.tecnico || null;
    if (body.tecnicoId) {
      const biomedico = await prisma.user.findUnique({
        where: { id: body.tecnicoId },
        select: { nombre: true, apellidos: true },
      });
      if (biomedico) {
        tecnicoNombre = `${biomedico.nombre}${biomedico.apellidos ? " " + biomedico.apellidos : ""}`;
      }
    }

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        equipoId:            id,
        tipo:                body.tipo,
        fecha:               new Date(body.fecha),
        descripcion:         body.descripcion ?? null,
        tecnico:             tecnicoNombre,
        costo:               body.costo ? Number(body.costo) : null,
        proximoMantenimiento: body.proximoMantenimiento ? new Date(body.proximoMantenimiento) : null,
      },
    });

    // Update equipment status if requested
    if (body.nuevoEstado) {
      await prisma.equipoMedico.update({ where: { id }, data: { estado: body.nuevoEstado } });
    }

    // Upsert TareaMantenimiento linked to this mantenimiento (non-fatal if it fails)
    if (body.proximoMantenimiento) {
      try {
        await prisma.tareaMantenimiento.deleteMany({
          where: { mantenimientoOrigenId: mantenimiento.id },
        });
        await prisma.tareaMantenimiento.create({
          data: {
            equipoId:             id,
            asignadoAId:          body.tecnicoId || null,
            asignadoPorId:        userId,
            fecha:                new Date(body.proximoMantenimiento),
            tipo:                 body.tipo,
            descripcion:          `Mantenimiento programado (${body.recurrencia ?? "personalizado"})`,
            recurrencia:          body.recurrencia || null,
            mantenimientoOrigenId: mantenimiento.id,
          },
        });
      } catch (e) {
        console.error("Error al crear TareaMantenimiento:", e);
      }
    }

    return NextResponse.json(mantenimiento, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar mantenimiento" }, { status: 500 });
  }
}
