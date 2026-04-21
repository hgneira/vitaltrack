import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["ADMINISTRADOR", "JEFE_BIOMEDICA"];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const mes = searchParams.get("mes"); // "2024-01"

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;

    // JEFE_BIOMEDICA can only see INGENIERIA_BIOMEDICA and JEFE_BIOMEDICA records
    if ((session.user as any).rol === "JEFE_BIOMEDICA") {
      where.user = { rol: { in: ["INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"] } };
    }

    if (mes) {
      const [year, month] = mes.split("-").map(Number);
      where.fecha = {
        gte: new Date(year, month - 1, 1),
        lt:  new Date(year, month, 1),
      };
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      include: { user: { select: { id: true, nombre: true, apellidos: true, rol: true } } },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(asistencias);
  } catch {
    return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // JEFE_BIOMEDICA can only register attendance for INGENIERIA_BIOMEDICA users
    if ((session.user as any).rol === "JEFE_BIOMEDICA") {
      const targetUser = await prisma.user.findUnique({ where: { id: body.userId }, select: { rol: true } });
      if (!targetUser || !["INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(targetUser.rol)) {
        return NextResponse.json({ error: "Solo puedes registrar asistencia de tu equipo biomédico" }, { status: 403 });
      }
    }

    const asistencia = await prisma.asistencia.upsert({
      where: {
        userId_fecha: {
          userId: body.userId,
          fecha:  new Date(body.fecha),
        },
      },
      update: {
        tipo:        body.tipo,
        horaEntrada: body.horaEntrada ? new Date(`${body.fecha}T${body.horaEntrada}`) : null,
        horaSalida:  body.horaSalida  ? new Date(`${body.fecha}T${body.horaSalida}`)  : null,
        notas:       body.notas ?? null,
      },
      create: {
        userId:      body.userId,
        fecha:       new Date(body.fecha),
        tipo:        body.tipo ?? "PRESENTE",
        horaEntrada: body.horaEntrada ? new Date(`${body.fecha}T${body.horaEntrada}`) : null,
        horaSalida:  body.horaSalida  ? new Date(`${body.fecha}T${body.horaSalida}`)  : null,
        notas:       body.notas ?? null,
      },
    });
    return NextResponse.json(asistencia, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar asistencia" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes((session.user as any).rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const fecha  = searchParams.get("fecha");
    if (!userId || !fecha) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    await prisma.asistencia.delete({ where: { userId_fecha: { userId, fecha: new Date(fecha) } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar asistencia" }, { status: 500 });
  }
}
