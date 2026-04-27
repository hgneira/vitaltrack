import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area") || null;
    const daysParam = parseInt(searchParams.get("days") || "30");
    const days = isNaN(daysParam) ? 30 : Math.min(daysParam, 365);

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    // ── 1. Fetch all equipos with related data ──────────────────────────────
    const equipos = await prisma.equipoMedico.findMany({
      where: area ? { ubicacion: area } : {},
      include: {
        mantenimientos: { orderBy: { fecha: "asc" } },
        acciones: { orderBy: { createdAt: "asc" } },
        accesorios: { select: { id: true } },
        verificaciones: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
      },
    });

    // ── 2. Fetch maintenance tasks ─────────────────────────────────────────
    const tareas = await prisma.tareaMantenimiento.findMany({
      where: area ? { equipo: { ubicacion: area } } : {},
    });

    // ── 3. Fetch all acciones in the time window ───────────────────────────
    const accionesAll = await prisma.accionDispositivo.findMany({
      where: {
        createdAt: { gte: from },
        ...(area ? { equipo: { ubicacion: area } } : {}),
      },
      include: { equipo: { select: { nombre: true, ubicacion: true } } },
      orderBy: { createdAt: "asc" },
    });

    const total = equipos.length;
    const activos = equipos.filter(e => e.estado === "ACTIVO").length;
    const enMant  = equipos.filter(e => e.estado === "EN_MANTENIMIENTO").length;
    const fuera   = equipos.filter(e => e.estado === "FUERA_DE_SERVICIO").length;

    // ── AVAILABILITY ────────────────────────────────────────────────────────

    // By area
    const areaMap = new Map<string, { total: number; activos: number; enMant: number; fuera: number }>();
    for (const eq of equipos) {
      const key = eq.ubicacion ?? "Sin área";
      if (!areaMap.has(key)) areaMap.set(key, { total: 0, activos: 0, enMant: 0, fuera: 0 });
      const a = areaMap.get(key)!;
      a.total++;
      if (eq.estado === "ACTIVO") a.activos++;
      else if (eq.estado === "EN_MANTENIMIENTO") a.enMant++;
      else if (eq.estado === "FUERA_DE_SERVICIO") a.fuera++;
    }
    const byArea = Array.from(areaMap.entries())
      .map(([nombre, v]) => ({ nombre, ...v, pctActivo: total > 0 ? Math.round(v.activos / v.total * 100) : 0 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Availability trend: how many equipos were ACTIVO each day (approximate from mantenimiento records)
    // We show the last N days of daily accion counts as proxy for activity
    const dailyActivityMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      dailyActivityMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of accionesAll) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (dailyActivityMap.has(key)) dailyActivityMap.set(key, (dailyActivityMap.get(key) ?? 0) + 1);
    }
    const dailyActivity = Array.from(dailyActivityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── MAINTENANCE KPIs ────────────────────────────────────────────────────

    // MTBF: Total operational device-days / number of corrective maintenance events
    const correctivos = equipos.flatMap(e => e.mantenimientos.filter(m => m.tipo === "CORRECTIVO"));
    let totalOpDays = 0;
    for (const eq of equipos) {
      const firstRecord = eq.fechaAdquisicion ?? eq.createdAt;
      const opDays = Math.max(0, Math.floor((now.getTime() - firstRecord.getTime()) / 86400000));
      totalOpDays += opDays;
    }
    const mtbf = correctivos.length > 0 ? Math.round(totalOpDays / correctivos.length) : null;

    // MTTR: average time between REPORTAR_PROBLEMA and next CORRECTIVO for same device
    const mttrValues: number[] = [];
    for (const eq of equipos) {
      const reportes = eq.acciones
        .filter(a => a.tipo === "REPORTAR_PROBLEMA")
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const corrMants = eq.mantenimientos
        .filter(m => m.tipo === "CORRECTIVO")
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

      for (const reporte of reportes) {
        const nextCorr = corrMants.find(m => m.fecha.getTime() >= reporte.createdAt.getTime());
        if (nextCorr) {
          const diffDays = (nextCorr.fecha.getTime() - reporte.createdAt.getTime()) / 86400000;
          if (diffDays >= 0 && diffDays < 365) mttrValues.push(diffDays);
        }
      }
    }
    const mttr = mttrValues.length > 0
      ? Math.round((mttrValues.reduce((s, v) => s + v, 0) / mttrValues.length) * 10) / 10
      : null;

    // Preventivos a tiempo
    const prevTareas = tareas.filter(t => t.tipo === "PREVENTIVO");
    const completadas = prevTareas.filter(t => t.estado === "COMPLETADO");
    const completadasATiempo = completadas.filter(t => t.updatedAt <= t.fecha).length;
    const completadasTarde = completadas.length - completadasATiempo;
    const vencidasSinCompletar = prevTareas.filter(t => t.estado === "PENDIENTE" && t.fecha < now).length;
    const pctPreventivosATiempo = completadas.length > 0
      ? Math.round(completadasATiempo / completadas.length * 100)
      : null;

    // Órdenes de mantenimiento
    const tareasAbiertas = tareas.filter(t => t.estado === "PENDIENTE").length;
    const tareasEnProceso = tareas.filter(t => t.estado === "EN_PROCESO").length;
    const tareasCompletadas = tareas.filter(t => t.estado === "COMPLETADO").length;
    const tareasCanceladas = tareas.filter(t => t.estado === "CANCELADO").length;

    // Maintenance trend: daily maintenance count in window
    const allMantsInWindow = equipos.flatMap(e =>
      e.mantenimientos.filter(m => m.fecha >= from && m.fecha <= now)
    );
    const dailyMantMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i);
      dailyMantMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const m of allMantsInWindow) {
      const key = m.fecha.toISOString().slice(0, 10);
      if (dailyMantMap.has(key)) dailyMantMap.set(key, (dailyMantMap.get(key) ?? 0) + 1);
    }
    const dailyMant = Array.from(dailyMantMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Mantenimientos by tipo in window
    const mantByTipo = {
      PREVENTIVO: allMantsInWindow.filter(m => m.tipo === "PREVENTIVO").length,
      CORRECTIVO: allMantsInWindow.filter(m => m.tipo === "CORRECTIVO").length,
      CALIBRACION: allMantsInWindow.filter(m => m.tipo === "CALIBRACION").length,
      INSPECCION: allMantsInWindow.filter(m => m.tipo === "INSPECCION").length,
      LIMPIEZA: allMantsInWindow.filter(m => m.tipo === "LIMPIEZA").length,
      VERIFICACION: allMantsInWindow.filter(m => m.tipo === "VERIFICACION").length,
    };

    // Próximos mantenimientos vencidos
    const mantVencidos = equipos.flatMap(e =>
      e.mantenimientos.filter(m => m.proximoMantenimiento && m.proximoMantenimiento < now)
    ).length;

    // ── TRACEABILITY ────────────────────────────────────────────────────────

    // Daily movements trend
    const dailyMovMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i);
      dailyMovMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of accionesAll) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (dailyMovMap.has(key)) dailyMovMap.set(key, (dailyMovMap.get(key) ?? 0) + 1);
    }
    const dailyMov = Array.from(dailyMovMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalMovimientos = accionesAll.length;
    const avgMovPerDay = days > 0 ? Math.round(totalMovimientos / days * 10) / 10 : 0;

    // Equipos sin actualización en 24h (that have had at least one action)
    const cutoff24h = new Date(now);
    cutoff24h.setHours(cutoff24h.getHours() - 24);
    const equiposConAcciones = equipos.filter(e => e.acciones.length > 0);
    const equiposSinActualizacion = equiposConAcciones.filter(e => {
      const last = e.acciones[e.acciones.length - 1];
      return last && last.createdAt < cutoff24h;
    }).length;

    // % checklists completados (devices with accesorios that have been verified in last 7 days)
    const cutoff7d = new Date(now);
    cutoff7d.setDate(cutoff7d.getDate() - 7);
    const equiposConAccesorios = equipos.filter(e => e.accesorios.length > 0);
    const verificadosReciente = equiposConAccesorios.filter(e =>
      e.verificaciones[0] && e.verificaciones[0].fecha >= cutoff7d
    ).length;
    const pctChecklists = equiposConAccesorios.length > 0
      ? Math.round(verificadosReciente / equiposConAccesorios.length * 100)
      : null;

    // ── URGENCIAS ───────────────────────────────────────────────────────────

    // Tiempo promedio de "préstamo" (TOMAR → DEVOLVER pairs for same device)
    const tiempoLoansMinutes: number[] = [];
    for (const eq of equipos) {
      const accs = eq.acciones.filter(a => a.createdAt >= from);
      for (let i = 0; i < accs.length; i++) {
        if (accs[i].tipo === "TOMAR") {
          const nextDevolver = accs.slice(i + 1).find(a => a.tipo === "DEVOLVER");
          if (nextDevolver) {
            const mins = (nextDevolver.createdAt.getTime() - accs[i].createdAt.getTime()) / 60000;
            if (mins > 0 && mins < 1440) tiempoLoansMinutes.push(mins); // cap at 24h
          }
        }
      }
    }
    const avgTiempoLoan = tiempoLoansMinutes.length > 0
      ? Math.round(tiempoLoansMinutes.reduce((s, v) => s + v, 0) / tiempoLoansMinutes.length)
      : null;

    // Most requested equipment (by TOMAR count)
    const equipoRequests = new Map<string, { nombre: string; count: number }>();
    for (const a of accionesAll) {
      if (a.tipo === "TOMAR") {
        const key = a.equipoId;
        if (!equipoRequests.has(key)) equipoRequests.set(key, { nombre: a.equipo.nombre, count: 0 });
        equipoRequests.get(key)!.count++;
      }
    }
    const equiposMasSolicitados = Array.from(equipoRequests.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Peak hours (count all acciones by hour of day)
    const hourMap: number[] = Array(24).fill(0);
    for (const a of accionesAll) {
      const h = a.createdAt.getHours();
      hourMap[h]++;
    }
    const horasPico = hourMap.map((count, hora) => ({ hora, count }));

    // Acciones by tipo in window
    const accionesByTipo = {
      TOMAR: accionesAll.filter(a => a.tipo === "TOMAR").length,
      MOVER: accionesAll.filter(a => a.tipo === "MOVER").length,
      DEVOLVER: accionesAll.filter(a => a.tipo === "DEVOLVER").length,
      REPORTAR_PROBLEMA: accionesAll.filter(a => a.tipo === "REPORTAR_PROBLEMA").length,
    };

    return NextResponse.json({
      generatedAt: now.toISOString(),
      filters: { area, days },
      availability: {
        total,
        activos,
        enMantenimiento: enMant,
        fueraDeServicio: fuera,
        pctActivos: total > 0 ? Math.round(activos / total * 100) : 0,
        pctEnMant: total > 0 ? Math.round(enMant / total * 100) : 0,
        pctFuera: total > 0 ? Math.round(fuera / total * 100) : 0,
        byArea,
        dailyActivity,
      },
      maintenance: {
        mtbf,
        mttr,
        pctPreventivosATiempo,
        completadasATiempo,
        completadasTarde,
        vencidasSinCompletar,
        mantVencidos,
        tareas: { abiertas: tareasAbiertas, enProceso: tareasEnProceso, completadas: tareasCompletadas, canceladas: tareasCanceladas },
        mantByTipo,
        dailyMant,
      },
      traceability: {
        totalMovimientos,
        avgMovPerDay,
        equiposSinActualizacion,
        pctChecklists,
        equiposConAccesorios: equiposConAccesorios.length,
        verificadosReciente,
        dailyMov,
        accionesByTipo,
      },
      urgencias: {
        avgTiempoLoan,
        totalLoans: tiempoLoansMinutes.length,
        equiposMasSolicitados,
        horasPico,
        accionesByTipo,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al calcular KPIs" }, { status: 500 });
  }
}
