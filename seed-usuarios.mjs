import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const USUARIOS = [
  { nombre: "Carlos",    apellidos: "Mendoza Ríos",       email: "ing.biomedico@vitaltrack.mx", password: "BioMed2026!",   rol: "INGENIERIA_BIOMEDICA", perfil: "Ingeniero Biomédico"        },
  { nombre: "Dra. Ana",  apellidos: "Gutiérrez López",    email: "dra.medico@vitaltrack.mx",    password: "Medico2026!",   rol: "MEDICO",               perfil: "Médico"                     },
  { nombre: "Sandra",    apellidos: "Pérez Vega",         email: "enf.sandra@vitaltrack.mx",    password: "Enfer2026!",    rol: "ENFERMERIA",           perfil: "Enfermería"                 },
  { nombre: "Roberto",   apellidos: "Torres Díaz",        email: "tec.mantto@vitaltrack.mx",    password: "Mantto2026!",   rol: "MANTENIMIENTO",        perfil: "Técnico de Mantenimiento"   },
  { nombre: "Admin",     apellidos: "Sistema VitalTrack", email: "admin.sistema@vitaltrack.mx", password: "Admin2026!",    rol: "ADMINISTRADOR",        perfil: "Administrador del Sistema"  },
  { nombre: "Dr. Miguel",apellidos: "Ramírez Castillo",   email: "director@vitaltrack.mx",      password: "Director2026!", rol: "JEFE_BIOMEDICA",       perfil: "Director / Jefe de Área"    },
];

async function main() {
  console.log("Creando usuarios de prueba...\n");

  const resultados = [];

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 12);

    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hash, rol: u.rol, nombre: u.nombre, apellidos: u.apellidos },
      });
      resultados.push({ ...u, status: "actualizado" });
    } else {
      await prisma.user.create({
        data: { nombre: u.nombre, apellidos: u.apellidos, email: u.email, password: hash, rol: u.rol, activo: true },
      });
      resultados.push({ ...u, status: "creado" });
    }
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("               USUARIOS DE PRUEBA — VITALTRACK                ");
  console.log("═══════════════════════════════════════════════════════════════");
  for (const u of resultados) {
    console.log(`\n  Perfil:    ${u.perfil}`);
    console.log(`  Email:     ${u.email}`);
    console.log(`  Contraseña: ${u.password}`);
    console.log(`  Rol:       ${u.rol}`);
    console.log(`  Estado:    ${u.status}`);
  }
  console.log("\n═══════════════════════════════════════════════════════════════");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
