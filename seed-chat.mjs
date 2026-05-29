import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CANALES = [
  { nombre: "General",               tipo: "GENERAL", rolAcceso: null },
  { nombre: "Enfermería",            tipo: "ROL",     rolAcceso: "ENFERMERIA" },
  { nombre: "Médicos",               tipo: "ROL",     rolAcceso: "MEDICO" },
  { nombre: "Ing. Biomédica",        tipo: "ROL",     rolAcceso: "INGENIERIA_BIOMEDICA" },
  { nombre: "Mantenimiento",         tipo: "ROL",     rolAcceso: "MANTENIMIENTO" },
  { nombre: "Urgencias",             tipo: "ROL",     rolAcceso: "URGENCIAS" },
  { nombre: "Jefes y Directores",    tipo: "ROL",     rolAcceso: "JEFE_BIOMEDICA" },
  { nombre: "Farmacia",              tipo: "ROL",     rolAcceso: "FARMACIA" },
];

async function main() {
  for (const c of CANALES) {
    const existing = await prisma.chatCanal.findFirst({ where: { nombre: c.nombre } });
    if (!existing) {
      await prisma.chatCanal.create({ data: c });
      console.log(`✓ Canal creado: ${c.nombre}`);
    } else {
      console.log(`- Ya existe: ${c.nombre}`);
    }
  }
  console.log("\n✅ Canales listos");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
