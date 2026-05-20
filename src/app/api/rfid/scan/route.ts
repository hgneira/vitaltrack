import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tag_uid, reader_id, area_nombre, timestamp } = body;

    if (!tag_uid || !area_nombre) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: tag_uid, area_nombre" },
        { status: 400 }
      );
    }

    // Find device by RFID tag UID
    const equipo = await prisma.equipoMedico.findUnique({
      where: { tagUid: tag_uid },
      select: { id: true, nombre: true, estado: true, ubicacion: true },
    });

    if (!equipo) {
      return NextResponse.json(
        { error: "Dispositivo no registrado" },
        { status: 404 }
      );
    }

    const areaOrigen = equipo.ubicacion ?? null;

    // Update device location
    await prisma.equipoMedico.update({
      where: { id: equipo.id },
      data: { ubicacion: area_nombre },
    });

    // Log movement in RFID traceability
    await prisma.registroRFID.create({
      data: {
        equipoId: equipo.id,
        readerId: reader_id ?? "desconocido",
        areaOrigen,
        areaDestino: area_nombre,
        timestamp: timestamp ?? new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      dispositivo: {
        nombre: equipo.nombre,
        estado: equipo.estado,
        ubicacion_anterior: areaOrigen,
        ubicacion_actual: area_nombre,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
