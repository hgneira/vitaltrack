import { prisma } from "./prisma";

type TipoAuditoria = "ACCESO" | "CREACION" | "MODIFICACION" | "ELIMINACION";

export async function logAuditoria({
  userId,
  accion,
  expedienteId,
  pacienteId,
  detalle,
  ip,
}: {
  userId: string;
  accion: TipoAuditoria;
  expedienteId?: string;
  pacienteId?: string;
  detalle?: string;
  ip?: string;
}) {
  try {
    await prisma.auditoriaExpediente.create({
      data: {
        userId,
        accion,
        expedienteId: expedienteId ?? null,
        pacienteId: pacienteId ?? null,
        detalle: detalle ?? null,
        ip: ip ?? null,
      },
    });
  } catch {
    // Audit log must never block the main operation
  }
}
