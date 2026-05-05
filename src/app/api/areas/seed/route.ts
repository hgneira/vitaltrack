import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const AREAS = [
  // ── Acceso y Recepción ────────────────────────────────────────
  { nombre: "Módulo de Recepción y Control",    categoria: "Acceso y Recepción",          capacidad: "1 módulo",         tipo: "ADMINISTRACION" as const },
  { nombre: "Estación de Camillas",             categoria: "Acceso y Recepción",          capacidad: "6-8 camillas",     tipo: "OTRO" as const },
  { nombre: "Estación de Sillas de Ruedas",     categoria: "Acceso y Recepción",          capacidad: "4-6 sillas",       tipo: "OTRO" as const },
  { nombre: "Sala de Espera",                   categoria: "Acceso y Recepción",          capacidad: "30-40 asientos",   tipo: "SALA_ESPERA" as const },
  { nombre: "Sanitario Público (Hombres)",      categoria: "Acceso y Recepción",          capacidad: "1 sanitario",      tipo: "BANO" as const },
  { nombre: "Sanitario Público (Mujeres)",      categoria: "Acceso y Recepción",          capacidad: "1 sanitario",      tipo: "BANO" as const },

  // ── Clasificación (Triage) ────────────────────────────────────
  { nombre: "Cubículo de Triage 1",             categoria: "Clasificación (Triage)",      capacidad: "1 cubículo",       tipo: "TRIAJE" as const },
  { nombre: "Cubículo de Triage 2",             categoria: "Clasificación (Triage)",      capacidad: "1 cubículo",       tipo: "TRIAJE" as const },
  { nombre: "Cubículo de Triage 3",             categoria: "Clasificación (Triage)",      capacidad: "1 cubículo",       tipo: "TRIAJE" as const },
  { nombre: "Área de Descontaminación",         categoria: "Clasificación (Triage)",      capacidad: "1 área",           tipo: "OTRO" as const },

  // ── Consulta y Tratamiento ────────────────────────────────────
  { nombre: "Cubículo de Observación General 1", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 2", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 3", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 4", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 5", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 6", categoria: "Consulta y Tratamiento",     capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación Pediátrica 1", categoria: "Consulta y Tratamiento",  capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación Pediátrica 2", categoria: "Consulta y Tratamiento",  capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Aislamiento 1",        categoria: "Consulta y Tratamiento",      capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Aislamiento 2",        categoria: "Consulta y Tratamiento",      capacidad: "1 cama",           tipo: "CUBICULO" as const },
  { nombre: "Sala de Choque",                   categoria: "Consulta y Tratamiento",      capacidad: "2 camas",          tipo: "SALA_CHOQUE" as const },
  { nombre: "Sala de Curaciones",               categoria: "Consulta y Tratamiento",      capacidad: "1 sala",           tipo: "OTRO" as const },
  { nombre: "Sala de Yesos",                    categoria: "Consulta y Tratamiento",      capacidad: "1 sala",           tipo: "OTRO" as const },

  // ── Hidratación ───────────────────────────────────────────────
  { nombre: "Hidratación Adultos",              categoria: "Hidratación",                 capacidad: "6-8 sillones",     tipo: "CUBICULO" as const },
  { nombre: "Hidratación Pediátrica",           categoria: "Hidratación",                 capacidad: "4-6 lugares",      tipo: "CUBICULO" as const },

  // ── Enfermería y Coordinación ─────────────────────────────────
  { nombre: "Central de Enfermeras",            categoria: "Enfermería y Coordinación",   capacidad: "1 estación",       tipo: "OTRO" as const },
  { nombre: "Cuarto de Medicamentos",           categoria: "Enfermería y Coordinación",   capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Cuarto de Material Estéril",       categoria: "Enfermería y Coordinación",   capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Cuarto de Ropa Limpia",            categoria: "Enfermería y Coordinación",   capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Cuarto de Ropa Sucia",             categoria: "Enfermería y Coordinación",   capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Cuarto de RPBI",                   categoria: "Enfermería y Coordinación",   capacidad: "1 cuarto",         tipo: "OTRO" as const },

  // ── Área Médica y Administrativa ──────────────────────────────
  { nombre: "Oficina del Médico Responsable",   categoria: "Médica y Administrativa",     capacidad: "1 oficina",        tipo: "ADMINISTRACION" as const },
  { nombre: "Sala de Juntas y Trabajo Médico",  categoria: "Médica y Administrativa",     capacidad: "1 sala",           tipo: "ADMINISTRACION" as const },
  { nombre: "Área de Trabajo de Enfermería",    categoria: "Médica y Administrativa",     capacidad: "1 área",           tipo: "OTRO" as const },
  { nombre: "Archivo de Expedientes",           categoria: "Médica y Administrativa",     capacidad: "1 cuarto",         tipo: "ADMINISTRACION" as const },

  // ── Servicios de Apoyo ────────────────────────────────────────
  { nombre: "Laboratorio Clínico de Urgencias", categoria: "Servicios de Apoyo",          capacidad: "1 laboratorio",    tipo: "LABORATORIO" as const },
  { nombre: "Sala de Rayos X",                  categoria: "Servicios de Apoyo",          capacidad: "1 sala",           tipo: "OTRO" as const },
  { nombre: "Cuarto de Ultrasonido",            categoria: "Servicios de Apoyo",          capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Banco de Sangre / Área de Transfusión", categoria: "Servicios de Apoyo",    capacidad: "1 área",           tipo: "LABORATORIO" as const },

  // ── Apoyo General ─────────────────────────────────────────────
  { nombre: "Sanitario Personal (Hombres)",     categoria: "Apoyo General",               capacidad: "1 sanitario",      tipo: "BANO" as const },
  { nombre: "Sanitario Personal (Mujeres)",     categoria: "Apoyo General",               capacidad: "1 sanitario",      tipo: "BANO" as const },
  { nombre: "Vestidor de Personal",             categoria: "Apoyo General",               capacidad: "1 vestidor",       tipo: "OTRO" as const },
  { nombre: "Cuarto de Limpieza",               categoria: "Apoyo General",               capacidad: "1 cuarto",         tipo: "OTRO" as const },
  { nombre: "Almacén de Equipos y Suministros", categoria: "Apoyo General",               capacidad: "1 almacén",        tipo: "OTRO" as const },
  { nombre: "Pasillo de Ambulancias",           categoria: "Apoyo General",               capacidad: "Acceso directo exterior", tipo: "PASILLO" as const },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Delete all existing areas
    await prisma.areaHospital.deleteMany({});

    // Insert all new areas
    const created = await prisma.areaHospital.createMany({
      data: AREAS.map(a => ({
        nombre:    a.nombre,
        categoria: a.categoria,
        capacidad: a.capacidad,
        tipo:      a.tipo,
        activo:    true,
      })),
    });

    return NextResponse.json({ ok: true, total: created.count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error al sembrar áreas" }, { status: 500 });
  }
}
