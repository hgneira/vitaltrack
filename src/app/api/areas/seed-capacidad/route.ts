import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Capacity map: area name patterns → max capacity
const CAPACITY_RULES: { pattern: RegExp; cap: number }[] = [
  { pattern: /sala de choque/i,                     cap: 2 },
  { pattern: /cubículo de observación general/i,    cap: 3 },
  { pattern: /cubículo de observación pediátrica/i, cap: 2 },
  { pattern: /cubículo de aislamiento/i,            cap: 1 },
  { pattern: /hidratación adultos/i,                cap: 8 },
  { pattern: /hidratación pediátrica/i,             cap: 6 },
  { pattern: /cubículo de triage/i,                 cap: 5 },
  { pattern: /triage\s*\d/i,                        cap: 5 },
  { pattern: /sala de espera/i,                     cap: 40 },
];

function getCapacity(nombre: string): number | null {
  for (const rule of CAPACITY_RULES) {
    if (rule.pattern.test(nombre)) return rule.cap;
  }
  return null;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const areas = await prisma.areaHospital.findMany({ select: { id: true, nombre: true } });
    let updated = 0;

    for (const area of areas) {
      const cap = getCapacity(area.nombre);
      if (cap !== null) {
        await prisma.areaHospital.update({
          where: { id: area.id },
          data: { capacidadMaxima: cap },
        });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
