import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export interface Notif {
  id: string;
  tipo: "cita" | "alerta" | "medicamento" | "tarea" | "equipo";
  titulo: string;
  descripcion: string;
  href: string;
  fecha: string;
  urgente?: boolean;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const rol    = (session.user as any).rol;
    const notifs: Notif[] = [];

    const today       = new Date();
    const startOfDay  = new Date(today); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay    = new Date(today); endOfDay.setHours(23, 59, 59, 999);

    // ── CITAS DE HOY ──────────────────────────────────────────────────────────
    if (["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"].includes(rol)) {
      const where =
        rol === "MEDICO"
          ? { medicoId: userId, estado: "PROGRAMADA" as const, fecha: { gte: startOfDay, lte: endOfDay } }
          : { estado: "PROGRAMADA" as const, fecha: { gte: startOfDay, lte: endOfDay } };

      const citas = await prisma.cita.findMany({
        where,
        include: { paciente: { select: { nombre: true, apellidos: true } } },
        orderBy: { fecha: "asc" },
      });

      for (const c of citas) {
        notifs.push({
          id: `cita-${c.id}`,
          tipo: "cita",
          titulo: "Cita programada hoy",
          descripcion: `${c.paciente.nombre} ${c.paciente.apellidos} · ${new Date(c.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
          href: "/dashboard/citas",
          fecha: c.fecha.toISOString(),
        });
      }
    }

    // ── ALERTAS PENDIENTES ────────────────────────────────────────────────────
    if (["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"].includes(rol)) {
      const tipoWhere =
        rol === "LIMPIEZA"       ? { tipo: "LIMPIEZA"      as const } :
        rol === "MANTENIMIENTO"  ? { tipo: "MANTENIMIENTO" as const } : {};

      const alertas = await prisma.alerta.findMany({
        where: { estado: "PENDIENTE", ...tipoWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      for (const a of alertas) {
        notifs.push({
          id: `alerta-${a.id}`,
          tipo: "alerta",
          titulo: a.titulo,
          descripcion: `Prioridad ${a.prioridad.toLowerCase()} · pendiente`,
          href: "/dashboard/alertas",
          fecha: a.createdAt.toISOString(),
          urgente: a.prioridad === "URGENTE" || a.prioridad === "ALTA",
        });
      }
    }

    // ── MEDICAMENTOS BAJO STOCK ───────────────────────────────────────────────
    if (["ADMINISTRADOR", "FARMACIA"].includes(rol)) {
      const meds = await prisma.medicamento.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, stock: true, stockMinimo: true, updatedAt: true },
      });

      for (const m of meds.filter((m) => m.stock <= m.stockMinimo)) {
        notifs.push({
          id: `med-${m.id}`,
          tipo: "medicamento",
          titulo: m.stock === 0 ? "Sin stock" : "Stock bajo",
          descripcion: `${m.nombre} · ${m.stock} uds. (mín. ${m.stockMinimo})`,
          href: "/dashboard/farmacia",
          fecha: m.updatedAt.toISOString(),
          urgente: m.stock === 0,
        });
      }
    }

    // ── TAREAS BIOMÉDICAS ─────────────────────────────────────────────────────
    if (["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"].includes(rol)) {
      const tareaWhere =
        rol === "INGENIERIA_BIOMEDICA"
          ? { asignadoAId: userId, estado: { in: ["PENDIENTE" as const, "EN_PROCESO" as const] } }
          : { estado: { in: ["PENDIENTE" as const, "EN_PROCESO" as const] } };

      const tareas = await prisma.tareaMantenimiento.findMany({
        where: tareaWhere,
        include: { equipo: { select: { nombre: true } } },
        orderBy: { fecha: "asc" },
        take: 15,
      });

      for (const t of tareas) {
        notifs.push({
          id: `tarea-${t.id}`,
          tipo: "tarea",
          titulo: t.estado === "PENDIENTE" ? "Tarea pendiente" : "Tarea en proceso",
          descripcion: `${t.equipo.nombre} · ${t.descripcion ?? t.tipo.toLowerCase()}`,
          href: rol === "INGENIERIA_BIOMEDICA" ? "/dashboard/biomedica/mis-tareas" : "/dashboard/biomedica",
          fecha: t.fecha.toISOString(),
          urgente: t.fecha < today && t.estado === "PENDIENTE",
        });
      }
    }

    // ── EQUIPOS FUERA DE SERVICIO / EN MANTENIMIENTO ──────────────────────────
    if (["ADMINISTRADOR", "JEFE_BIOMEDICA"].includes(rol)) {
      const equipos = await prisma.equipoMedico.findMany({
        where: { estado: { in: ["EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"] } },
        select: { id: true, nombre: true, estado: true, updatedAt: true },
        take: 10,
      });

      for (const e of equipos) {
        notifs.push({
          id: `equipo-${e.id}`,
          tipo: "equipo",
          titulo: e.estado === "FUERA_DE_SERVICIO" ? "Equipo fuera de servicio" : "Equipo en mantenimiento",
          descripcion: e.nombre,
          href: "/dashboard/biomedica",
          fecha: e.updatedAt.toISOString(),
          urgente: e.estado === "FUERA_DE_SERVICIO",
        });
      }
    }

    // Sort: urgentes primero, luego por fecha descendente
    notifs.sort((a, b) => {
      if (a.urgente && !b.urgente) return -1;
      if (!a.urgente && b.urgente) return 1;
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    return NextResponse.json(notifs);
  } catch {
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}
