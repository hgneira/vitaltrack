import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { calcularRiesgo } from "@/lib/riesgo";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const equipoId = searchParams.get("equipoId");

  const where = equipoId ? { id: equipoId } : {};

  const equipos = await prisma.equipoMedico.findMany({
    where,
    select: {
      id: true,
      nombre: true,
      estado: true,
      fechaAdquisicion: true,
      vidaUtilAnios: true,
      mantenimientos: {
        select: { tipo: true, fecha: true, proximoMantenimiento: true },
        orderBy: { fecha: "desc" },
      },
      tareas: {
        where: { estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
        select: { fecha: true, tipo: true },
      },
    },
  });

  const ahora = new Date();

  const results = equipos.map((eq) => {
    const correctivos = eq.mantenimientos.filter((m) => m.tipo === "CORRECTIVO").length;

    const preventivos = eq.mantenimientos
      .filter((m) => m.tipo === "PREVENTIVO")
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    const diasDesdeUltimoPreventivo = preventivos.length > 0
      ? Math.floor((ahora.getTime() - preventivos[0].fecha.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Count tasks that are overdue (past due date and not completed)
    const mantenimientosVencidos = eq.tareas.filter(
      (t) => new Date(t.fecha) < ahora
    ).length;

    const riesgo = calcularRiesgo({
      fechaAdquisicion: eq.fechaAdquisicion,
      vidaUtilAnios: eq.vidaUtilAnios ?? 10,
      estado: eq.estado,
      correctivos,
      diasDesdeUltimoPreventivo,
      mantenimientosVencidos,
    });

    return { equipoId: eq.id, nombre: eq.nombre, ...riesgo };
  });

  // Auto-create alerts for HIGH risk devices (fire and forget)
  const altosRiesgo = results.filter((r) => r.nivel === "ALTO");
  if (altosRiesgo.length > 0) {
    const userId = (session.user as any).id;
    // Find any JEFE_BIOMEDICA or INGENIERIA_BIOMEDICA to assign
    const ingeniero = await prisma.user.findFirst({
      where: { rol: { in: ["JEFE_BIOMEDICA", "INGENIERIA_BIOMEDICA"] }, activo: true },
      select: { id: true },
    });

    for (const r of altosRiesgo) {
      const titulo = `Riesgo ALTO: ${r.nombre}`;
      const existing = await prisma.alerta.findFirst({
        where: {
          titulo,
          estado: { in: ["PENDIENTE", "EN_PROCESO"] },
        },
      });
      if (!existing) {
        await prisma.alerta.create({
          data: {
            titulo,
            descripcion: `Score de riesgo: ${r.score}/100. Factores: ${r.factores.join("; ")}`,
            tipo: "MANTENIMIENTO",
            prioridad: "ALTA",
            estado: "PENDIENTE",
            creadaPorId: userId,
            asignadaAId: ingeniero?.id ?? null,
          },
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json(results);
}
