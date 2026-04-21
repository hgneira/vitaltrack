import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: "postgresql://hospital_user:Hospital2024!@localhost:5432/hospital_db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // ── Base users ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@hospital.com" },
    update: {},
    create: {
      nombre: "Administrador", apellidos: "Sistema",
      email: "admin@hospital.com", password: await hash("Admin2024!"),
      rol: "ADMINISTRADOR", activo: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "biomedico@hospital.com" },
    update: {},
    create: {
      nombre: "Ana", apellidos: "Martínez",
      email: "biomedico@hospital.com", password: await hash("Bio2024!"),
      rol: "INGENIERIA_BIOMEDICA", activo: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "limpieza@hospital.com" },
    update: {},
    create: {
      nombre: "José", apellidos: "Ramírez",
      email: "limpieza@hospital.com", password: await hash("Limpieza2024!"),
      rol: "LIMPIEZA", activo: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "farmacia@hospital.com" },
    update: {},
    create: {
      nombre: "Laura", apellidos: "Sánchez",
      email: "farmacia@hospital.com", password: await hash("Farmacia2024!"),
      rol: "FARMACIA", activo: true,
    },
  });

  // ── Doctors ─────────────────────────────────────────────────────────────
  const garcia = await prisma.user.upsert({
    where: { email: "dra.garcia@hospital.com" },
    update: {},
    create: {
      nombre: "Sofía", apellidos: "García Mendoza",
      email: "dra.garcia@hospital.com", password: await hash("Doctor123!"),
      rol: "MEDICO", especialidad: "Medicina Interna",
      telefono: "5512345601",
      escuela: "Universidad Nacional Autónoma de México (UNAM)",
      cedulaProfesional: "MED-2891034", activo: true,
    },
  });

  const ramirez = await prisma.user.upsert({
    where: { email: "dr.ramirez@hospital.com" },
    update: {},
    create: {
      nombre: "Carlos", apellidos: "Ramírez Torres",
      email: "dr.ramirez@hospital.com", password: await hash("Doctor123!"),
      rol: "MEDICO", especialidad: "Cardiología",
      telefono: "5512345602",
      escuela: "Instituto Politécnico Nacional (IPN)",
      cedulaProfesional: "MED-3104872", activo: true,
    },
  });

  const lopez = await prisma.user.upsert({
    where: { email: "dra.lopez@hospital.com" },
    update: {},
    create: {
      nombre: "Ana", apellidos: "López Herrera",
      email: "dra.lopez@hospital.com", password: await hash("Doctor123!"),
      rol: "MEDICO", especialidad: "Pediatría",
      telefono: "5512345603",
      escuela: "Universidad de Guadalajara (UDG)",
      cedulaProfesional: "MED-4456123", activo: true,
    },
  });

  const moreno = await prisma.user.upsert({
    where: { email: "dr.moreno@hospital.com" },
    update: {},
    create: {
      nombre: "Miguel", apellidos: "Moreno Castillo",
      email: "dr.moreno@hospital.com", password: await hash("Doctor123!"),
      rol: "MEDICO", especialidad: "Ortopedia",
      telefono: "5512345604",
      escuela: "Universidad Autónoma de Nuevo León (UANL)",
      cedulaProfesional: "MED-5672901", activo: true,
    },
  });

  const vega = await prisma.user.upsert({
    where: { email: "dra.vega@hospital.com" },
    update: {},
    create: {
      nombre: "Patricia", apellidos: "Vega Ruiz",
      email: "dra.vega@hospital.com", password: await hash("Doctor123!"),
      rol: "MEDICO", especialidad: "Neurología",
      telefono: "5512345605",
      escuela: "Universidad Nacional Autónoma de México (UNAM)",
      cedulaProfesional: "MED-6234789", activo: true,
    },
  });

  // ── Patients ─────────────────────────────────────────────────────────────
  const mkPaciente = async (data: {
    nombre: string; apellidos: string; dob: string; sexo: string;
    tel: string; email: string; alergias: string; antecedentes: string;
  }) => {
    const existing = await prisma.paciente.findFirst({ where: { email: data.email } });
    if (existing) return existing;
    return prisma.paciente.create({
      data: {
        nombre: data.nombre, apellidos: data.apellidos,
        fechaNacimiento: new Date(data.dob), sexo: data.sexo,
        telefono: data.tel, email: data.email,
        alergias: data.alergias, antecedentes: data.antecedentes,
        contactoEmergencia: "Familiar", telefonoEmergencia: "5500000000",
      },
    });
  };

  const p1  = await mkPaciente({ nombre: "Roberto",  apellidos: "Sánchez Pérez",   dob: "1978-03-15", sexo: "M", tel: "5520001001", email: "roberto.s@mail.com",  alergias: "Penicilina",      antecedentes: "Hipertensión arterial" });
  const p2  = await mkPaciente({ nombre: "María",    apellidos: "Flores Castillo",  dob: "1990-07-22", sexo: "F", tel: "5520001002", email: "maria.f@mail.com",    alergias: "Ninguna",         antecedentes: "Diabetes tipo 2" });
  const p3  = await mkPaciente({ nombre: "Jorge",    apellidos: "Hernández Luna",   dob: "1965-11-08", sexo: "M", tel: "5520001003", email: "jorge.h@mail.com",    alergias: "Ibuprofeno",      antecedentes: "Insuficiencia cardíaca" });
  const p4  = await mkPaciente({ nombre: "Laura",    apellidos: "Martínez Gómez",   dob: "1985-05-30", sexo: "F", tel: "5520001004", email: "laura.m@mail.com",    alergias: "Ninguna",         antecedentes: "Asma bronquial" });
  const p5  = await mkPaciente({ nombre: "Antonio",  apellidos: "Cruz Mendoza",     dob: "1972-09-14", sexo: "M", tel: "5520001005", email: "antonio.c@mail.com",  alergias: "Sulfas",          antecedentes: "Fractura de cadera previa" });
  const p6  = await mkPaciente({ nombre: "Carmen",   apellidos: "Reyes Jiménez",    dob: "1994-02-28", sexo: "F", tel: "5520001006", email: "carmen.r@mail.com",   alergias: "Ninguna",         antecedentes: "Epilepsia" });
  const p7  = await mkPaciente({ nombre: "Daniel",   apellidos: "Torres Vargas",    dob: "2010-06-12", sexo: "M", tel: "5520001007", email: "daniel.t@mail.com",   alergias: "Lactosa",         antecedentes: "Otitis recurrente" });
  const p8  = await mkPaciente({ nombre: "Sofía",    apellidos: "Gutiérrez Ríos",   dob: "2018-01-05", sexo: "F", tel: "5520001008", email: "sofia.g@mail.com",    alergias: "Ninguna",         antecedentes: "Bronquitis frecuente" });
  const p9  = await mkPaciente({ nombre: "Fernando", apellidos: "Díaz Morales",     dob: "1958-08-20", sexo: "M", tel: "5520001009", email: "fernando.d@mail.com", alergias: "Aspirina",        antecedentes: "Cardiopatía isquémica" });
  const p10 = await mkPaciente({ nombre: "Isabel",   apellidos: "Ramírez Ortega",   dob: "1988-12-03", sexo: "F", tel: "5520001010", email: "isabel.r@mail.com",   alergias: "Ninguna",         antecedentes: "Migraña crónica" });
  const p11 = await mkPaciente({ nombre: "Héctor",   apellidos: "Silva Domínguez",  dob: "1970-04-17", sexo: "M", tel: "5520001011", email: "hector.s@mail.com",   alergias: "Cefalosporinas",  antecedentes: "Lumbalgia crónica" });
  const p12 = await mkPaciente({ nombre: "Gabriela", apellidos: "Mendoza Salinas",  dob: "2015-10-25", sexo: "F", tel: "5520001012", email: "gabriela.m@mail.com", alergias: "Polen",           antecedentes: "Rinitis alérgica" });

  // ── Appointments ─────────────────────────────────────────────────────────
  const d = (days: number, hour = 10) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    dt.setHours(hour, 0, 0, 0);
    return dt;
  };

  const citas = [
    // Dra. García — Medicina Interna
    { medicoId: garcia.id, pacienteId: p1.id,  fecha: d(-30),    motivo: "Control hipertensión",              estado: "COMPLETADA" },
    { medicoId: garcia.id, pacienteId: p2.id,  fecha: d(-15, 9), motivo: "Revisión diabetes",                 estado: "COMPLETADA" },
    { medicoId: garcia.id, pacienteId: p4.id,  fecha: d(-5, 11), motivo: "Evaluación asma",                   estado: "COMPLETADA" },
    { medicoId: garcia.id, pacienteId: p1.id,  fecha: d(3, 9),   motivo: "Seguimiento antihipertensivo",      estado: "PROGRAMADA" },
    { medicoId: garcia.id, pacienteId: p2.id,  fecha: d(10, 10), motivo: "Control glucémico mensual",         estado: "PROGRAMADA" },
    { medicoId: garcia.id, pacienteId: p4.id,  fecha: d(14, 11), motivo: "Control asma bronquial",            estado: "PROGRAMADA" },
    // Dr. Ramírez — Cardiología
    { medicoId: ramirez.id, pacienteId: p3.id, fecha: d(-20),    motivo: "Ecocardiograma y revisión",         estado: "COMPLETADA" },
    { medicoId: ramirez.id, pacienteId: p9.id, fecha: d(-10, 8), motivo: "Valoración cardiopatía",            estado: "COMPLETADA" },
    { medicoId: ramirez.id, pacienteId: p1.id, fecha: d(-5, 14), motivo: "Interconsulta hipertensión",        estado: "COMPLETADA" },
    { medicoId: ramirez.id, pacienteId: p3.id, fecha: d(2, 8),   motivo: "Ajuste medicación cardíaca",        estado: "PROGRAMADA" },
    { medicoId: ramirez.id, pacienteId: p9.id, fecha: d(7, 14),  motivo: "Prueba de esfuerzo",                estado: "PROGRAMADA" },
    // Dra. López — Pediatría
    { medicoId: lopez.id,  pacienteId: p7.id,  fecha: d(-25),    motivo: "Control del niño sano",             estado: "COMPLETADA" },
    { medicoId: lopez.id,  pacienteId: p8.id,  fecha: d(-8, 10), motivo: "Bronquitis aguda",                  estado: "COMPLETADA" },
    { medicoId: lopez.id,  pacienteId: p12.id, fecha: d(-3, 9),  motivo: "Alergia estacional",                estado: "COMPLETADA" },
    { medicoId: lopez.id,  pacienteId: p7.id,  fecha: d(1, 10),  motivo: "Revisión otitis",                   estado: "PROGRAMADA" },
    { medicoId: lopez.id,  pacienteId: p8.id,  fecha: d(4, 9),   motivo: "Seguimiento bronquitis",            estado: "PROGRAMADA" },
    { medicoId: lopez.id,  pacienteId: p12.id, fecha: d(6, 11),  motivo: "Control rinitis alérgica",          estado: "PROGRAMADA" },
    // Dr. Moreno — Ortopedia
    { medicoId: moreno.id, pacienteId: p5.id,  fecha: d(-40),    motivo: "Revisión prótesis de cadera",       estado: "COMPLETADA" },
    { medicoId: moreno.id, pacienteId: p11.id, fecha: d(-12, 9), motivo: "Lumbalgia aguda",                   estado: "COMPLETADA" },
    { medicoId: moreno.id, pacienteId: p5.id,  fecha: d(8, 15),  motivo: "Control posoperatorio 6 meses",     estado: "PROGRAMADA" },
    { medicoId: moreno.id, pacienteId: p11.id, fecha: d(12, 10), motivo: "Seguimiento fisioterapia lumbar",   estado: "PROGRAMADA" },
    // Dra. Vega — Neurología
    { medicoId: vega.id,   pacienteId: p6.id,  fecha: d(-35),    motivo: "Ajuste antiepilépticos",            estado: "COMPLETADA" },
    { medicoId: vega.id,   pacienteId: p10.id, fecha: d(-18, 11),motivo: "Evaluación migraña crónica",        estado: "COMPLETADA" },
    { medicoId: vega.id,   pacienteId: p6.id,  fecha: d(-2, 16), motivo: "Crisis convulsiva — urgencia",      estado: "COMPLETADA" },
    { medicoId: vega.id,   pacienteId: p10.id, fecha: d(9, 13),  motivo: "Seguimiento tratamiento migraña",   estado: "PROGRAMADA" },
    { medicoId: vega.id,   pacienteId: p6.id,  fecha: d(14, 11), motivo: "Control neurológico mensual",       estado: "PROGRAMADA" },
  ];

  for (const c of citas) {
    const exists = await prisma.cita.findFirst({ where: { medicoId: c.medicoId, pacienteId: c.pacienteId, fecha: c.fecha } });
    if (!exists) await prisma.cita.create({ data: c as any });
  }

  // ── Hospital areas ────────────────────────────────────────────────────────
  const areas = [
    { nombre: "Habitación 101",           piso: "1er Piso",    tipo: "CUARTO_PACIENTE" as const },
    { nombre: "Habitación 102",           piso: "1er Piso",    tipo: "CUARTO_PACIENTE" as const },
    { nombre: "Baño General Planta Baja", piso: "Planta Baja", tipo: "BANO" as const },
    { nombre: "Sala de Espera Principal", piso: "Planta Baja", tipo: "SALA_ESPERA" as const },
    { nombre: "Pasillo Norte",            piso: "1er Piso",    tipo: "PASILLO" as const },
    { nombre: "Quirófano 1",              piso: "2do Piso",    tipo: "QUIROFANO" as const },
    { nombre: "Laboratorio",              piso: "1er Piso",    tipo: "LABORATORIO" as const },
    { nombre: "Farmacia",                 piso: "Planta Baja", tipo: "FARMACIA" as const },
  ];

  for (const area of areas) {
    const exists = await prisma.areaHospital.findFirst({ where: { nombre: area.nombre } });
    if (!exists) await prisma.areaHospital.create({ data: area });
  }

  // ── Medical equipment ─────────────────────────────────────────────────────
  const equipos = [
    { nombre: "Monitor de Signos Vitales", marca: "Philips",  modelo: "MX800",     numeroSerie: "PH-001-2022", ubicacion: "Quirófano 1",   estado: "ACTIVO" as const,          fechaAdquisicion: new Date("2022-03-15") },
    { nombre: "Ventilador Mecánico",       marca: "Dräger",   modelo: "Evita V800",numeroSerie: "DR-002-2021", ubicacion: "UCI",           estado: "ACTIVO" as const,          fechaAdquisicion: new Date("2021-07-20") },
    { nombre: "Desfibrilador",             marca: "Zoll",     modelo: "R Series",  numeroSerie: "ZO-003-2023", ubicacion: "Urgencias",     estado: "EN_MANTENIMIENTO" as const,fechaAdquisicion: new Date("2023-01-10") },
    { nombre: "Bomba de Infusión",         marca: "BD",       modelo: "Alaris",    numeroSerie: "BD-004-2022", ubicacion: "Habitación 101",estado: "ACTIVO" as const,          fechaAdquisicion: new Date("2022-08-05") },
  ];

  for (const eq of equipos) {
    await prisma.equipoMedico.upsert({ where: { numeroSerie: eq.numeroSerie }, update: {}, create: eq });
  }

  // ── Medications ───────────────────────────────────────────────────────────
  const meds = [
    { nombre: "Paracetamol 500mg",       principioActivo: "Paracetamol", presentacion: "Tabletas",    concentracion: "500mg", stock: 200, stockMinimo: 50, unidad: "Cajas",   precio: 45.00 },
    { nombre: "Amoxicilina 500mg",       principioActivo: "Amoxicilina", presentacion: "Cápsulas",    concentracion: "500mg", stock: 80,  stockMinimo: 20, unidad: "Cajas",   precio: 120.00 },
    { nombre: "Omeprazol 20mg",          principioActivo: "Omeprazol",   presentacion: "Cápsulas",    concentracion: "20mg",  stock: 15,  stockMinimo: 20, unidad: "Cajas",   precio: 95.00 },
    { nombre: "Metformina 850mg",        principioActivo: "Metformina",  presentacion: "Tabletas",    concentracion: "850mg", stock: 60,  stockMinimo: 30, unidad: "Cajas",   precio: 75.00 },
    { nombre: "Solución Fisiológica 0.9%",principioActivo: "NaCl",       presentacion: "Frasco IV",   concentracion: "0.9%",  stock: 50,  stockMinimo: 25, unidad: "Frascos", precio: 35.00 },
  ];

  for (const med of meds) {
    const exists = await prisma.medicamento.findFirst({ where: { nombre: med.nombre } });
    if (!exists) await prisma.medicamento.create({ data: med });
  }

  console.log("✅ Seed completado");
  console.log("   admin@hospital.com           / Admin2024!");
  console.log("   dra.garcia@hospital.com      / Doctor123!");
  console.log("   dr.ramirez@hospital.com      / Doctor123!");
  console.log("   dra.lopez@hospital.com       / Doctor123!");
  console.log("   dr.moreno@hospital.com       / Doctor123!");
  console.log("   dra.vega@hospital.com        / Doctor123!");
  console.log("   biomedico@hospital.com       / Bio2024!");
  console.log("   limpieza@hospital.com        / Limpieza2024!");
  console.log("   farmacia@hospital.com        / Farmacia2024!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
