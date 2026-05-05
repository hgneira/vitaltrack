import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ── ÁREAS ────────────────────────────────────────────────────────────────────
const AREAS = [
  { nombre: "Módulo de Recepción y Control",      categoria: "Acceso y Recepción",        capacidad: "1 módulo",              tipo: "ADMINISTRACION" as const },
  { nombre: "Estación de Camillas",               categoria: "Acceso y Recepción",        capacidad: "6-8 camillas",          tipo: "OTRO" as const },
  { nombre: "Estación de Sillas de Ruedas",       categoria: "Acceso y Recepción",        capacidad: "4-6 sillas",            tipo: "OTRO" as const },
  { nombre: "Sala de Espera",                     categoria: "Acceso y Recepción",        capacidad: "30-40 asientos",        tipo: "SALA_ESPERA" as const },
  { nombre: "Sanitario Público (Hombres)",        categoria: "Acceso y Recepción",        capacidad: "1 sanitario",           tipo: "BANO" as const },
  { nombre: "Sanitario Público (Mujeres)",        categoria: "Acceso y Recepción",        capacidad: "1 sanitario",           tipo: "BANO" as const },

  { nombre: "Cubículo de Triage 1",               categoria: "Clasificación (Triage)",    capacidad: "1 cubículo",            tipo: "TRIAJE" as const },
  { nombre: "Cubículo de Triage 2",               categoria: "Clasificación (Triage)",    capacidad: "1 cubículo",            tipo: "TRIAJE" as const },
  { nombre: "Cubículo de Triage 3",               categoria: "Clasificación (Triage)",    capacidad: "1 cubículo",            tipo: "TRIAJE" as const },
  { nombre: "Área de Descontaminación",           categoria: "Clasificación (Triage)",    capacidad: "1 área",                tipo: "OTRO" as const },

  { nombre: "Cubículo de Observación General 1",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 2",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 3",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 4",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 5",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación General 6",    categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación Pediátrica 1", categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Observación Pediátrica 2", categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Aislamiento 1",            categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Cubículo de Aislamiento 2",            categoria: "Consulta y Tratamiento",  capacidad: "1 cama",                tipo: "CUBICULO" as const },
  { nombre: "Sala de Choque",                       categoria: "Consulta y Tratamiento",  capacidad: "2 camas",               tipo: "SALA_CHOQUE" as const },
  { nombre: "Sala de Curaciones",                   categoria: "Consulta y Tratamiento",  capacidad: "1 sala",                tipo: "OTRO" as const },
  { nombre: "Sala de Yesos",                        categoria: "Consulta y Tratamiento",  capacidad: "1 sala",                tipo: "OTRO" as const },

  { nombre: "Hidratación Adultos",                categoria: "Hidratación",               capacidad: "6-8 sillones",          tipo: "CUBICULO" as const },
  { nombre: "Hidratación Pediátrica",             categoria: "Hidratación",               capacidad: "4-6 lugares",           tipo: "CUBICULO" as const },

  { nombre: "Central de Enfermeras",              categoria: "Enfermería y Coordinación", capacidad: "1 estación",            tipo: "OTRO" as const },
  { nombre: "Cuarto de Medicamentos",             categoria: "Enfermería y Coordinación", capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Cuarto de Material Estéril",         categoria: "Enfermería y Coordinación", capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Cuarto de Ropa Limpia",              categoria: "Enfermería y Coordinación", capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Cuarto de Ropa Sucia",               categoria: "Enfermería y Coordinación", capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Cuarto de RPBI",                     categoria: "Enfermería y Coordinación", capacidad: "1 cuarto",              tipo: "OTRO" as const },

  { nombre: "Oficina del Médico Responsable",     categoria: "Médica y Administrativa",   capacidad: "1 oficina",             tipo: "ADMINISTRACION" as const },
  { nombre: "Sala de Juntas y Trabajo Médico",    categoria: "Médica y Administrativa",   capacidad: "1 sala",                tipo: "ADMINISTRACION" as const },
  { nombre: "Área de Trabajo de Enfermería",      categoria: "Médica y Administrativa",   capacidad: "1 área",                tipo: "OTRO" as const },
  { nombre: "Archivo de Expedientes",             categoria: "Médica y Administrativa",   capacidad: "1 cuarto",              tipo: "ADMINISTRACION" as const },

  { nombre: "Laboratorio Clínico de Urgencias",   categoria: "Servicios de Apoyo",        capacidad: "1 laboratorio",         tipo: "LABORATORIO" as const },
  { nombre: "Sala de Rayos X",                    categoria: "Servicios de Apoyo",        capacidad: "1 sala",                tipo: "OTRO" as const },
  { nombre: "Cuarto de Ultrasonido",              categoria: "Servicios de Apoyo",        capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Banco de Sangre / Área de Transfusión", categoria: "Servicios de Apoyo",    capacidad: "1 área",                tipo: "LABORATORIO" as const },

  { nombre: "Sanitario Personal (Hombres)",       categoria: "Apoyo General",             capacidad: "1 sanitario",           tipo: "BANO" as const },
  { nombre: "Sanitario Personal (Mujeres)",       categoria: "Apoyo General",             capacidad: "1 sanitario",           tipo: "BANO" as const },
  { nombre: "Vestidor de Personal",               categoria: "Apoyo General",             capacidad: "1 vestidor",            tipo: "OTRO" as const },
  { nombre: "Cuarto de Limpieza",                 categoria: "Apoyo General",             capacidad: "1 cuarto",              tipo: "OTRO" as const },
  { nombre: "Almacén de Equipos y Suministros",   categoria: "Apoyo General",             capacidad: "1 almacén",             tipo: "OTRO" as const },
  { nombre: "Pasillo de Ambulancias",             categoria: "Apoyo General",             capacidad: "Acceso directo exterior", tipo: "PASILLO" as const },
];

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
// { nombre, marca?, modelo?, numeroSerie, ubicacion, estado }
type E = { nombre: string; marca?: string; modelo?: string; numeroSerie: string; ubicacion: string; estado?: "ACTIVO" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO" };

const sn = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

const EQUIPOS: E[] = [
  // ── SALA DE CHOQUE ──────────────────────────────────────────────────────────
  { nombre: "Monitor multiparámetros",     marca: "Philips",       modelo: "IntelliVue MX450",    numeroSerie: sn("SC-MON", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Monitor multiparámetros",     marca: "Philips",       modelo: "IntelliVue MX450",    numeroSerie: sn("SC-MON", 2),  ubicacion: "Sala de Choque" },
  { nombre: "Desfibrilador/cardioversor",  marca: "Zoll",          modelo: "R Series Plus",       numeroSerie: sn("SC-DEF", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Ventilador mecánico",         marca: "Dräger",        modelo: "Savina 300",          numeroSerie: sn("SC-VEN", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Ventilador mecánico",         marca: "Dräger",        modelo: "Savina 300",          numeroSerie: sn("SC-VEN", 2),  ubicacion: "Sala de Choque" },
  { nombre: "Bomba de infusión",           marca: "B.Braun",       modelo: "Perfusor Space",      numeroSerie: sn("SC-BOM", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Bomba de infusión",           marca: "B.Braun",       modelo: "Perfusor Space",      numeroSerie: sn("SC-BOM", 2),  ubicacion: "Sala de Choque" },
  { nombre: "Bomba de infusión",           marca: "B.Braun",       modelo: "Perfusor Space",      numeroSerie: sn("SC-BOM", 3),  ubicacion: "Sala de Choque" },
  { nombre: "Bomba de infusión",           marca: "B.Braun",       modelo: "Perfusor Space",      numeroSerie: sn("SC-BOM", 4),  ubicacion: "Sala de Choque" },
  { nombre: "Carro de paro cardiorrespiratorio", marca: "Rubbermaid", modelo: "Saf-T-Cart",      numeroSerie: sn("SC-CAR", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Aspirador de secreciones",    marca: "Medela",        modelo: "Dominant 50",         numeroSerie: sn("SC-ASP", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Aspirador de secreciones",    marca: "Medela",        modelo: "Dominant 50",         numeroSerie: sn("SC-ASP", 2),  ubicacion: "Sala de Choque" },
  { nombre: "Laringoscopio de video",      marca: "Storz",         modelo: "C-MAC D-BLADE",       numeroSerie: sn("SC-LAR", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Oxímetro de pulso",           marca: "Nellcor",       modelo: "PM10N",               numeroSerie: sn("SC-OXI", 1),  ubicacion: "Sala de Choque" },
  { nombre: "Glucómetro",                  marca: "Roche",         modelo: "Accu-Chek Inform II", numeroSerie: sn("SC-GLU", 1),  ubicacion: "Sala de Choque" },

  // ── CUBÍCULOS OBSERVACIÓN GENERAL 1–6 ──────────────────────────────────────
  ...([1,2,3,4,5,6].flatMap(n => [
    { nombre: "Monitor multiparámetros",  marca: "Mindray",  modelo: "iMEC 10",           numeroSerie: sn(`OG${n}-MON`, 1),  ubicacion: `Cubículo de Observación General ${n}` },
    { nombre: "Bomba de infusión",        marca: "Baxter",   modelo: "Sigma Spectrum 6",  numeroSerie: sn(`OG${n}-BOM`, 1),  ubicacion: `Cubículo de Observación General ${n}` },
    { nombre: "Oxímetro de pulso",        marca: "Masimo",   modelo: "Radical-7",         numeroSerie: sn(`OG${n}-OXI`, 1),  ubicacion: `Cubículo de Observación General ${n}` },
  ])) as E[],

  // ── CUBÍCULOS OBSERVACIÓN PEDIÁTRICA 1–2 ───────────────────────────────────
  ...([1,2].flatMap(n => [
    { nombre: "Monitor multiparámetros pediátrico", marca: "Mindray",   modelo: "PM-60",          numeroSerie: sn(`OP${n}-MON`, 1), ubicacion: `Cubículo de Observación Pediátrica ${n}` },
    { nombre: "Bomba de infusión pediátrica",        marca: "BD Alaris", modelo: "8015 Pump Module", numeroSerie: sn(`OP${n}-BOM`, 1), ubicacion: `Cubículo de Observación Pediátrica ${n}` },
    { nombre: "Oxímetro de pulso pediátrico",        marca: "Masimo",    modelo: "MightySat Rx",   numeroSerie: sn(`OP${n}-OXI`, 1), ubicacion: `Cubículo de Observación Pediátrica ${n}` },
  ])) as E[],

  // ── CUBÍCULOS DE AISLAMIENTO 1–2 ───────────────────────────────────────────
  ...([1,2].flatMap(n => [
    { nombre: "Monitor multiparámetros", marca: "Nihon Kohden", modelo: "BSM-1700",      numeroSerie: sn(`AI${n}-MON`, 1), ubicacion: `Cubículo de Aislamiento ${n}` },
    { nombre: "Bomba de infusión",       marca: "B.Braun",      modelo: "Infusomat Space", numeroSerie: sn(`AI${n}-BOM`, 1), ubicacion: `Cubículo de Aislamiento ${n}` },
  ])) as E[],

  // ── SALA DE CURACIONES ──────────────────────────────────────────────────────
  { nombre: "Lámpara de exploración LED",   marca: "Burton",    modelo: "Procedure",       numeroSerie: sn("CUR-LAM", 1), ubicacion: "Sala de Curaciones" },
  { nombre: "Electrocauterio",              marca: "Covidien",  modelo: "Force FX-8C",     numeroSerie: sn("CUR-ELE", 1), ubicacion: "Sala de Curaciones" },
  { nombre: "Aspirador quirúrgico",         marca: "Medela",    modelo: "Vario 18",        numeroSerie: sn("CUR-ASP", 1), ubicacion: "Sala de Curaciones" },

  // ── SALA DE YESOS ───────────────────────────────────────────────────────────
  { nombre: "Sierra oscilante para yesos",  marca: "Stryker",   modelo: "Cast Cutter 840", numeroSerie: sn("YES-SIE", 1), ubicacion: "Sala de Yesos" },
  { nombre: "Lámpara de exploración",       marca: "Waldmann",  modelo: "FL 300",          numeroSerie: sn("YES-LAM", 1), ubicacion: "Sala de Yesos" },

  // ── LABORATORIO CLÍNICO DE URGENCIAS ───────────────────────────────────────
  { nombre: "Analizador de gases sanguíneos", marca: "Abbott",    modelo: "i-STAT 1",       numeroSerie: sn("LAB-GAS", 1), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Analizador hematológico",        marca: "Sysmex",    modelo: "XN-350",          numeroSerie: sn("LAB-HEM", 1), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Centrífuga clínica",             marca: "Eppendorf", modelo: "5810R",           numeroSerie: sn("LAB-CEN", 1), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Microscopio binocular",          marca: "Olympus",   modelo: "CX23",            numeroSerie: sn("LAB-MIC", 1), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Glucómetro",                     marca: "Roche",     modelo: "Accu-Chek Inform II", numeroSerie: sn("LAB-GLU", 1), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Glucómetro",                     marca: "Roche",     modelo: "Accu-Chek Inform II", numeroSerie: sn("LAB-GLU", 2), ubicacion: "Laboratorio Clínico de Urgencias" },
  { nombre: "Analizador de electrolitos",     marca: "Beckman",   modelo: "UniCel DxC 700",  numeroSerie: sn("LAB-ELE", 1), ubicacion: "Laboratorio Clínico de Urgencias" },

  // ── SALA DE RAYOS X ─────────────────────────────────────────────────────────
  { nombre: "Equipo de rayos X digital",  marca: "Siemens",  modelo: "Ysio Max",         numeroSerie: sn("RX-EQP", 1), ubicacion: "Sala de Rayos X" },
  { nombre: "Negatoscopio LED",           marca: "Cablas",   modelo: "NL-3",             numeroSerie: sn("RX-NEG", 1), ubicacion: "Sala de Rayos X" },
  { nombre: "Chalecos de plomo",          marca: "Bar-Ray",  modelo: "Protecta-Lite",    numeroSerie: sn("RX-CHL", 1), ubicacion: "Sala de Rayos X" },

  // ── CUARTO DE ULTRASONIDO ──────────────────────────────────────────────────
  { nombre: "Equipo de ultrasonido",      marca: "Mindray",  modelo: "Z6 Diagnostic",    numeroSerie: sn("USG-EQP", 1), ubicacion: "Cuarto de Ultrasonido" },

  // ── BANCO DE SANGRE / ÁREA DE TRANSFUSIÓN ─────────────────────────────────
  { nombre: "Refrigerador para hemoderivados", marca: "Helmer",  modelo: "iB105",           numeroSerie: sn("BS-REF", 1), ubicacion: "Banco de Sangre / Área de Transfusión" },
  { nombre: "Agitador de plaquetas",           marca: "Helmer",  modelo: "PF48i",           numeroSerie: sn("BS-AGI", 1), ubicacion: "Banco de Sangre / Área de Transfusión" },
  { nombre: "Centrífuga refrigerada",          marca: "Sorvall", modelo: "ST16R",           numeroSerie: sn("BS-CEN", 1), ubicacion: "Banco de Sangre / Área de Transfusión" },
  { nombre: "Detector de irradiación",         marca: "Helmer",  modelo: "HLR1000",         numeroSerie: sn("BS-DET", 1), ubicacion: "Banco de Sangre / Área de Transfusión" },

  // ── HIDRATACIÓN ADULTOS ────────────────────────────────────────────────────
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 1), ubicacion: "Hidratación Adultos" },
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 2), ubicacion: "Hidratación Adultos" },
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 3), ubicacion: "Hidratación Adultos" },
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 4), ubicacion: "Hidratación Adultos" },
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 5), ubicacion: "Hidratación Adultos" },
  { nombre: "Bomba de infusión",  marca: "Baxter",  modelo: "Sigma Spectrum 6", numeroSerie: sn("HA-BOM", 6), ubicacion: "Hidratación Adultos" },
  { nombre: "Oxímetro de pulso",  marca: "Nellcor", modelo: "PM10N",            numeroSerie: sn("HA-OXI", 1), ubicacion: "Hidratación Adultos" },
  { nombre: "Oxímetro de pulso",  marca: "Nellcor", modelo: "PM10N",            numeroSerie: sn("HA-OXI", 2), ubicacion: "Hidratación Adultos" },

  // ── HIDRATACIÓN PEDIÁTRICA ─────────────────────────────────────────────────
  { nombre: "Bomba de infusión pediátrica",  marca: "BD Alaris",  modelo: "8015 Pump Module", numeroSerie: sn("HP-BOM", 1), ubicacion: "Hidratación Pediátrica" },
  { nombre: "Bomba de infusión pediátrica",  marca: "BD Alaris",  modelo: "8015 Pump Module", numeroSerie: sn("HP-BOM", 2), ubicacion: "Hidratación Pediátrica" },
  { nombre: "Bomba de infusión pediátrica",  marca: "BD Alaris",  modelo: "8015 Pump Module", numeroSerie: sn("HP-BOM", 3), ubicacion: "Hidratación Pediátrica" },
  { nombre: "Bomba de infusión pediátrica",  marca: "BD Alaris",  modelo: "8015 Pump Module", numeroSerie: sn("HP-BOM", 4), ubicacion: "Hidratación Pediátrica" },
  { nombre: "Oxímetro de pulso pediátrico",  marca: "Masimo",     modelo: "Rad-5",            numeroSerie: sn("HP-OXI", 1), ubicacion: "Hidratación Pediátrica" },
  { nombre: "Oxímetro de pulso pediátrico",  marca: "Masimo",     modelo: "Rad-5",            numeroSerie: sn("HP-OXI", 2), ubicacion: "Hidratación Pediátrica" },

  // ── CENTRAL DE ENFERMERAS ──────────────────────────────────────────────────
  { nombre: "Computadora de escritorio", marca: "Dell",  modelo: "OptiPlex 7090",      numeroSerie: sn("CE-PC", 1), ubicacion: "Central de Enfermeras" },
  { nombre: "Computadora de escritorio", marca: "Dell",  modelo: "OptiPlex 7090",      numeroSerie: sn("CE-PC", 2), ubicacion: "Central de Enfermeras" },
  { nombre: "Impresora láser",           marca: "HP",    modelo: "LaserJet Pro M404n", numeroSerie: sn("CE-IMP", 1), ubicacion: "Central de Enfermeras" },
  { nombre: "Sistema de intercomunicación", marca: "Ascom", modelo: "Unite Messenger", numeroSerie: sn("CE-INT", 1), ubicacion: "Central de Enfermeras" },
  { nombre: "Tensiómetro digital",       marca: "Omron", modelo: "HBP-1300",           numeroSerie: sn("CE-TEN", 1), ubicacion: "Central de Enfermeras" },

  // ── CUARTO DE MEDICAMENTOS ─────────────────────────────────────────────────
  { nombre: "Refrigerador de medicamentos", marca: "Helmer",    modelo: "HC102",      numeroSerie: sn("MED-REF", 1), ubicacion: "Cuarto de Medicamentos" },
  { nombre: "Gabinete de narcóticos",       marca: "Medtech",   modelo: "Secure-Rx",  numeroSerie: sn("MED-GAB", 1), ubicacion: "Cuarto de Medicamentos" },

  // ── CUBÍCULOS DE TRIAGE 1–3 ───────────────────────────────────────────────
  ...([1,2,3].flatMap(n => [
    { nombre: "Oxímetro de pulso",     marca: "Nellcor",  modelo: "PM10N",          numeroSerie: sn(`TRI${n}-OXI`, 1), ubicacion: `Cubículo de Triage ${n}` },
    { nombre: "Tensiómetro digital",   marca: "Omron",    modelo: "HBP-1300",       numeroSerie: sn(`TRI${n}-TEN`, 1), ubicacion: `Cubículo de Triage ${n}` },
    { nombre: "Báscula digital",       marca: "Seca",     modelo: "803",            numeroSerie: sn(`TRI${n}-BAS`, 1), ubicacion: `Cubículo de Triage ${n}` },
    { nombre: "Glucómetro",            marca: "Roche",    modelo: "Accu-Chek Go",   numeroSerie: sn(`TRI${n}-GLU`, 1), ubicacion: `Cubículo de Triage ${n}` },
    { nombre: "Termómetro infrarrojo", marca: "Braun",    modelo: "ThermoScan 7",   numeroSerie: sn(`TRI${n}-TER`, 1), ubicacion: `Cubículo de Triage ${n}` },
  ])) as E[],

  // ── ÁREA DE DESCONTAMINACIÓN ───────────────────────────────────────────────
  { nombre: "Ducha de descontaminación",  marca: "Guardian",   modelo: "G1954",      numeroSerie: sn("DES-DUC", 1), ubicacion: "Área de Descontaminación" },
  { nombre: "Aspirador portátil",         marca: "Laerdal",    modelo: "Suction Unit V7", numeroSerie: sn("DES-ASP", 1), ubicacion: "Área de Descontaminación" },

  // ── OFICINA DEL MÉDICO RESPONSABLE ────────────────────────────────────────
  { nombre: "Computadora portátil",   marca: "Dell",  modelo: "Latitude 5520",    numeroSerie: sn("OMR-PC", 1),  ubicacion: "Oficina del Médico Responsable" },

  // ── SALA DE JUNTAS Y TRABAJO MÉDICO ───────────────────────────────────────
  { nombre: "Pantalla interactiva",   marca: "Samsung",  modelo: "QM65B",         numeroSerie: sn("SJM-PAN", 1), ubicacion: "Sala de Juntas y Trabajo Médico" },
  { nombre: "Computadora de escritorio", marca: "Dell",  modelo: "OptiPlex 5090", numeroSerie: sn("SJM-PC", 1),  ubicacion: "Sala de Juntas y Trabajo Médico" },

  // ── MÓDULO DE RECEPCIÓN Y CONTROL ─────────────────────────────────────────
  { nombre: "Computadora de escritorio", marca: "Dell",     modelo: "OptiPlex 3090",    numeroSerie: sn("REC-PC", 1),  ubicacion: "Módulo de Recepción y Control" },
  { nombre: "Computadora de escritorio", marca: "Dell",     modelo: "OptiPlex 3090",    numeroSerie: sn("REC-PC", 2),  ubicacion: "Módulo de Recepción y Control" },
  { nombre: "Impresora de pulseras",     marca: "Zebra",    modelo: "ZD421",            numeroSerie: sn("REC-IMP", 1), ubicacion: "Módulo de Recepción y Control" },
  { nombre: "Lector de código QR/barras", marca: "Honeywell", modelo: "Voyager XP 1470", numeroSerie: sn("REC-LEC", 1), ubicacion: "Módulo de Recepción y Control" },

  // ── ALMACÉN DE EQUIPOS Y SUMINISTROS ──────────────────────────────────────
  { nombre: "Báscula industrial",   marca: "Seca",     modelo: "877",             numeroSerie: sn("ALM-BAS", 1), ubicacion: "Almacén de Equipos y Suministros" },
  { nombre: "Carro de transporte de equipos", marca: "Rubbermaid", modelo: "FG450088", numeroSerie: sn("ALM-CAR", 1), ubicacion: "Almacén de Equipos y Suministros" },

  // ── SALA DE ESPERA ─────────────────────────────────────────────────────────
  { nombre: "Televisor",             marca: "Samsung",  modelo: "55\" Crystal UHD", numeroSerie: sn("ESP-TV", 1), ubicacion: "Sala de Espera" },
  { nombre: "Televisor",             marca: "Samsung",  modelo: "55\" Crystal UHD", numeroSerie: sn("ESP-TV", 2), ubicacion: "Sala de Espera" },
  { nombre: "Dispensador de fichas", marca: "Qmatic",   modelo: "Orchestra 7",      numeroSerie: sn("ESP-DIS", 1), ubicacion: "Sala de Espera" },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // ── 1. Eliminar equipos y sus dependencias ────────────────────────────────
    await prisma.verificacionItem.deleteMany({});
    await prisma.verificacionAccesorios.deleteMany({});
    await prisma.accesorioEquipo.deleteMany({});
    await prisma.accionDispositivo.deleteMany({});
    await prisma.dispositivoUtilizado.deleteMany({});
    await prisma.tareaMantenimiento.deleteMany({});
    await prisma.mantenimiento.deleteMany({});
    await prisma.guiaRapida.deleteMany({});
    await prisma.documentoEquipo.deleteMany({});
    await prisma.equipoMedico.deleteMany({});

    // ── 2. Eliminar áreas y sus dependencias ──────────────────────────────────
    await prisma.registroLimpieza.deleteMany({});
    await prisma.alerta.updateMany({ data: { areaId: null } });
    await prisma.areaHospital.deleteMany({});

    // ── 3. Crear áreas ────────────────────────────────────────────────────────
    const areasCreadas = await prisma.areaHospital.createMany({
      data: AREAS.map(a => ({
        nombre:    a.nombre,
        categoria: a.categoria,
        capacidad: a.capacidad,
        tipo:      a.tipo,
        activo:    true,
      })),
    });

    // ── 4. Crear equipos ──────────────────────────────────────────────────────
    const equiposCreados = await prisma.equipoMedico.createMany({
      data: EQUIPOS.map(e => ({
        nombre:      e.nombre,
        marca:       e.marca,
        modelo:      e.modelo,
        numeroSerie: e.numeroSerie,
        ubicacion:   e.ubicacion,
        estado:      e.estado ?? "ACTIVO",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      areas: areasCreadas.count,
      equipos: equiposCreados.count,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "Error en seed" }, { status: 500 });
  }
}
