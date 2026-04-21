import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["TOMAR", "MOVER", "DEVOLVER", "REPORTAR_PROBLEMA"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, area, notas, nuevoEstado } = body;

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de acción inválido" }, { status: 400 });
  }

  const equipo = await prisma.equipoMedico.findUnique({ where: { id } });
  if (!equipo) return NextResponse.json({ error: "Dispositivo no encontrado" }, { status: 404 });

  // Run accion + optional estado/area update in a transaction
  const [accion] = await prisma.$transaction([
    prisma.accionDispositivo.create({
      data: {
        equipoId: id,
        userId: (session.user as any).id,
        tipo: tipo as any,
        area: area || equipo.ubicacion || null,
        notas: notas || null,
      },
      include: { user: { select: { nombre: true, apellidos: true, rol: true } } },
    }),
    // Update equipo estado and/or ubicacion if provided
    ...(nuevoEstado || area
      ? [prisma.equipoMedico.update({
          where: { id },
          data: {
            ...(nuevoEstado ? { estado: nuevoEstado } : {}),
            ...(tipo === "MOVER" && area ? { ubicacion: area } : {}),
          },
        })]
      : []),
  ]);

  return NextResponse.json(accion, { status: 201 });
}
