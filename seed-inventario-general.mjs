import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Helper: random date between two years
const rDate = (y1, y2) => {
  const s = new Date(y1, 0, 1).getTime();
  const e = new Date(y2, 11, 31).getTime();
  return new Date(s + Math.random() * (e - s));
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const serial = (prefix) => `${prefix}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

const ESTADOS = ["ACTIVO", "ACTIVO", "ACTIVO", "ACTIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"];

const EQUIPOS = [
  // ══════════════════════════════════════════════════════
  //  ÁREAS CLÍNICAS
  // ══════════════════════════════════════════════════════

  // ── Medicina interna (10 equipos)
  { nombre:"Monitor multiparámetros",    marca:"Philips",   modelo:"IntelliVue MX450", ubicacion:"Medicina interna" },
  { nombre:"Monitor multiparámetros",    marca:"Mindray",   modelo:"BC-5380",           ubicacion:"Medicina interna" },
  { nombre:"Bomba de infusión",          marca:"Baxter",    modelo:"Sigma Spectrum",    ubicacion:"Medicina interna" },
  { nombre:"Bomba de infusión",          marca:"B. Braun",  modelo:"Infusomat Space",   ubicacion:"Medicina interna" },
  { nombre:"Bomba de infusión",          marca:"B. Braun",  modelo:"Perfusor Space",    ubicacion:"Medicina interna" },
  { nombre:"Electrocardiógrafo 12 der.", marca:"Schiller",  modelo:"AT-10 Plus",        ubicacion:"Medicina interna" },
  { nombre:"Glucómetro",                 marca:"Accu-Chek", modelo:"Inform II",         ubicacion:"Medicina interna" },
  { nombre:"Oxímetro de pulso portátil", marca:"Masimo",    modelo:"Rad-5",             ubicacion:"Medicina interna" },
  { nombre:"Tensiómetro digital",        marca:"Welch Allyn", modelo:"ProBP 3400",      ubicacion:"Medicina interna" },
  { nombre:"Carro de curación",          marca:"Parity",    modelo:"CC-500",            ubicacion:"Medicina interna" },

  // ── Cirugía general (10 equipos)
  { nombre:"Mesa quirúrgica eléctrica",  marca:"Maquet",    modelo:"Alphamaxx",         ubicacion:"Cirugía general" },
  { nombre:"Lámpara quirúrgica LED",     marca:"Berchtold", modelo:"Chromophare E700",  ubicacion:"Cirugía general" },
  { nombre:"Electrocauterio",            marca:"Valleylab", modelo:"FT10",              ubicacion:"Cirugía general" },
  { nombre:"Aspirador quirúrgico",       marca:"Medela",    modelo:"Dominant Flex",     ubicacion:"Cirugía general" },
  { nombre:"Laparoscopio",               marca:"Storz",     modelo:"IMAGE1 S",          ubicacion:"Cirugía general" },
  { nombre:"Insuflador de CO2",          marca:"Storz",     modelo:"THERMOFLATOR",      ubicacion:"Cirugía general" },
  { nombre:"Monitor de anestesia",       marca:"Dräger",    modelo:"Perseus A500",      ubicacion:"Cirugía general" },
  { nombre:"Vaporizador de isoflurano",  marca:"Dräger",    modelo:"Vapor 2000",        ubicacion:"Cirugía general" },
  { nombre:"Aspirador de humo quirúrgico",marca:"Buffalo", modelo:"MF-230",            ubicacion:"Cirugía general" },
  { nombre:"Electrocauterio bipolar",    marca:"Erbe",      modelo:"VIO 300 D",         ubicacion:"Cirugía general" },

  // ── Pediatría (9 equipos)
  { nombre:"Incubadora neonatal",        marca:"Dräger",    modelo:"Isolette C2",       ubicacion:"Pediatría" },
  { nombre:"Monitor pediátrico multiparámetros", marca:"Mindray", modelo:"iMEC8",       ubicacion:"Pediatría" },
  { nombre:"Monitor pediátrico multiparámetros", marca:"Philips", modelo:"IntelliVue MP30", ubicacion:"Pediatría" },
  { nombre:"Nebulizador ultrasónico",    marca:"PARI",      modelo:"PARI TurboBOY",     ubicacion:"Pediatría" },
  { nombre:"Lámpara de fototerapia",     marca:"Dräger",    modelo:"Bilimeter II",      ubicacion:"Pediatría" },
  { nombre:"Báscula pediátrica digital", marca:"SECA",      modelo:"354",               ubicacion:"Pediatría" },
  { nombre:"Bomba de infusión pediátrica",marca:"Baxter",   modelo:"Sigma Spectrum",    ubicacion:"Pediatría" },
  { nombre:"Oxímetro pediátrico",        marca:"Masimo",    modelo:"Radical-7",         ubicacion:"Pediatría" },
  { nombre:"Estetoscopio electrónico",   marca:"3M Littmann",modelo:"3200",             ubicacion:"Pediatría" },

  // ── Ginecología y obstetricia (9 equipos)
  { nombre:"Monitor fetal",              marca:"Philips",   modelo:"Avalon FM30",       ubicacion:"Ginecología y obstetricia" },
  { nombre:"Monitor fetal",              marca:"GE Healthcare",modelo:"Corometrics 250cx",ubicacion:"Ginecología y obstetricia" },
  { nombre:"Colposcopio",                marca:"Leisegang", modelo:"3MFD",              ubicacion:"Ginecología y obstetricia" },
  { nombre:"Ultrasonido obstétrico",     marca:"Mindray",   modelo:"DC-60",             ubicacion:"Ginecología y obstetricia" },
  { nombre:"Lámpara de exploración LED", marca:"Dexter",    modelo:"LS-100",            ubicacion:"Ginecología y obstetricia" },
  { nombre:"Electrocauterio ginecológico",marca:"Valleylab",modelo:"Force FX",          ubicacion:"Ginecología y obstetricia" },
  { nombre:"Bomba de infusión",          marca:"B. Braun",  modelo:"Infusomat Space",   ubicacion:"Ginecología y obstetricia" },
  { nombre:"Cuna de calor radiante",     marca:"Dräger",    modelo:"Babytherm 8004",    ubicacion:"Ginecología y obstetricia" },
  { nombre:"Aspirador de secreciones",   marca:"Medela",    modelo:"Basic S",           ubicacion:"Ginecología y obstetricia" },

  // ── Traumatología y ortopedia (9 equipos)
  { nombre:"Arco en C (fluoroscopio)",   marca:"Siemens",   modelo:"Cios Alpha",        ubicacion:"Traumatología y ortopedia" },
  { nombre:"Taladro ortopédico",         marca:"Stryker",   modelo:"System 6",          ubicacion:"Traumatología y ortopedia" },
  { nombre:"Electrocauterio",            marca:"Medtronic", modelo:"Aquamantys 6",      ubicacion:"Traumatología y ortopedia" },
  { nombre:"Artroscopio",                marca:"Storz",     modelo:"Hopkins II",        ubicacion:"Traumatología y ortopedia" },
  { nombre:"Torre de artroscopia",       marca:"Linvatec",  modelo:"HALL 5050",         ubicacion:"Traumatología y ortopedia" },
  { nombre:"Equipo de tracción ortopédica",marca:"Maquet",  modelo:"Alphatrac",         ubicacion:"Traumatología y ortopedia" },
  { nombre:"Monitor multiparámetros",    marca:"Nihon Kohden",modelo:"BSM-3562",        ubicacion:"Traumatología y ortopedia" },
  { nombre:"Aspirador quirúrgico",       marca:"Medela",    modelo:"Dominant Flex",     ubicacion:"Traumatología y ortopedia" },
  { nombre:"Dermátomo eléctrico",        marca:"Zimmer",    modelo:"Hall Micro-Aire",   ubicacion:"Traumatología y ortopedia" },

  // ── UCI (12 equipos)
  { nombre:"Ventilador mecánico",        marca:"Dräger",    modelo:"Evita Infinity V500",ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Ventilador mecánico",        marca:"Hamilton Medical",modelo:"HAMILTON-C3", ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Ventilador mecánico",        marca:"Puritan Bennett",modelo:"PB980",        ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Monitor multiparámetros",    marca:"Philips",   modelo:"IntelliVue MX800",  ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Monitor multiparámetros",    marca:"GE Healthcare",modelo:"CARESCAPE B650", ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Desfibrilador",              marca:"Zoll",      modelo:"R Series",          ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Bomba de infusión",          marca:"B. Braun",  modelo:"Infusomat Space",   ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Bomba de jeringa",           marca:"B. Braun",  modelo:"Perfusor Space",    ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Equipo de hemodiálisis",     marca:"Fresenius", modelo:"multiFiltrate Pro", ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Broncoscopio",               marca:"Olympus",   modelo:"BF-P180",           ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Calentador de fluidos",      marca:"3M",        modelo:"Ranger 245",        ubicacion:"Unidad de cuidados intensivos (UCI)" },
  { nombre:"Carro de paro",              marca:"Parity",    modelo:"CP-800",            ubicacion:"Unidad de cuidados intensivos (UCI)" },

  // ── UCIN (10 equipos)
  { nombre:"Incubadora de cuidados intensivos",marca:"Dräger",modelo:"Isolette TI500", ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Incubadora de cuidados intensivos",marca:"GE Healthcare",modelo:"Giraffe Omnibed",ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Ventilador neonatal",        marca:"Dräger",    modelo:"Babylog VN500",     ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Ventilador neonatal",        marca:"Hamilton Medical",modelo:"HAMILTON-C1", ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Monitor neonatal",           marca:"Philips",   modelo:"IntelliVue MP20",   ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Lámpara de fototerapia LED", marca:"Dräger",    modelo:"Bilisoft LED",      ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Báscula neonatal",           marca:"SECA",      modelo:"374",               ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Bomba de jeringa neonatal",  marca:"B. Braun",  modelo:"Perfusor Compact",  ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Oxímetro neonatal",          marca:"Masimo",    modelo:"Radical-7",         ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },
  { nombre:"Calentador radiante",        marca:"Atom Medical",modelo:"Infant Warmer v-808",ubicacion:"Unidad de cuidados intensivos neonatales (UCIN)" },

  // ── Hospitalización general (8 equipos)
  { nombre:"Monitor de signos vitales portátil",marca:"Mindray",modelo:"VS-900",       ubicacion:"Hospitalización general" },
  { nombre:"Monitor de signos vitales portátil",marca:"Welch Allyn",modelo:"Connex",   ubicacion:"Hospitalización general" },
  { nombre:"Bomba de infusión",          marca:"Baxter",    modelo:"Sigma Spectrum",    ubicacion:"Hospitalización general" },
  { nombre:"Glucómetro",                 marca:"Accu-Chek", modelo:"Inform II",         ubicacion:"Hospitalización general" },
  { nombre:"Tensiómetro digital",        marca:"Omron",     modelo:"HEM-907XL",         ubicacion:"Hospitalización general" },
  { nombre:"Oxímetro de pulso",          marca:"Nonin",     modelo:"9550",              ubicacion:"Hospitalización general" },
  { nombre:"Nebulizador",                marca:"DeVilbiss", modelo:"5650D",             ubicacion:"Hospitalización general" },
  { nombre:"Carro de curación",          marca:"Parity",    modelo:"CC-400",            ubicacion:"Hospitalización general" },

  // ══════════════════════════════════════════════════════
  //  APOYO DIAGNÓSTICO
  // ══════════════════════════════════════════════════════

  // ── Laboratorio clínico general (10 equipos)
  { nombre:"Analizador hematológico",    marca:"Sysmex",    modelo:"XN-1000",           ubicacion:"Laboratorio clínico general" },
  { nombre:"Analizador de química sanguínea",marca:"Roche", modelo:"Cobas c 311",       ubicacion:"Laboratorio clínico general" },
  { nombre:"Analizador de gases en sangre",marca:"Siemens", modelo:"RAPIDPoint 500e",   ubicacion:"Laboratorio clínico general" },
  { nombre:"Microscopio binocular",      marca:"Olympus",   modelo:"CX43",              ubicacion:"Laboratorio clínico general" },
  { nombre:"Centrífuga de sobremesa",    marca:"Hettich",   modelo:"EBA 21",            ubicacion:"Laboratorio clínico general" },
  { nombre:"Autoclave de laboratorio",   marca:"Tuttnauer", modelo:"2540M",             ubicacion:"Laboratorio clínico general" },
  { nombre:"Baño de agua",               marca:"Memmert",   modelo:"WB 14",             ubicacion:"Laboratorio clínico general" },
  { nombre:"Analizador de coagulación",  marca:"Stago",     modelo:"STA-R Max",         ubicacion:"Laboratorio clínico general" },
  { nombre:"Espectrofotómetro",          marca:"Thermo Fisher",modelo:"GENESYS 30",      ubicacion:"Laboratorio clínico general" },
  { nombre:"Agitador de tubos",          marca:"IKA",       modelo:"Vortex 3",          ubicacion:"Laboratorio clínico general" },

  // ── Radiología e imagen (7 equipos)
  { nombre:"Equipo de rayos X digital",  marca:"Siemens",   modelo:"YSIO Max",          ubicacion:"Radiología e imagen" },
  { nombre:"Tomógrafo computarizado",    marca:"GE Healthcare",modelo:"Revolution EVO", ubicacion:"Radiología e imagen" },
  { nombre:"Resonancia magnética 1.5T",  marca:"Siemens",   modelo:"MAGNETOM Essenza",  ubicacion:"Radiología e imagen" },
  { nombre:"Mamógrafo digital",          marca:"Hologic",   modelo:"Dimensions",        ubicacion:"Radiología e imagen" },
  { nombre:"Revelador de placas CR",     marca:"Carestream",modelo:"VITA CR",           ubicacion:"Radiología e imagen" },
  { nombre:"Workstation de diagnóstico", marca:"Siemens",   modelo:"syngo.via",         ubicacion:"Radiología e imagen" },
  { nombre:"Fluoroscopio digital",       marca:"Philips",   modelo:"Veradius Neo",      ubicacion:"Radiología e imagen" },

  // ── Ultrasonido (5 equipos)
  { nombre:"Equipo de ultrasonido",      marca:"GE Healthcare",modelo:"LOGIQ E10",      ubicacion:"Ultrasonido" },
  { nombre:"Equipo de ultrasonido",      marca:"Philips",   modelo:"EPIQ 7",            ubicacion:"Ultrasonido" },
  { nombre:"Ultrasonido portátil",       marca:"Mindray",   modelo:"TE7 Max",           ubicacion:"Ultrasonido" },
  { nombre:"Ultrasonido Doppler",        marca:"Toshiba",   modelo:"Aplio i800",        ubicacion:"Ultrasonido" },
  { nombre:"Ultrasonido point-of-care",  marca:"Fujifilm",  modelo:"SonoSite M-Turbo",  ubicacion:"Ultrasonido" },

  // ── Electrocardiografía (5 equipos)
  { nombre:"Electrocardiógrafo 12 der.", marca:"Nihon Kohden",modelo:"Cardiofax M",     ubicacion:"Electrocardiografía" },
  { nombre:"Electrocardiógrafo 12 der.", marca:"GE Healthcare",modelo:"MAC 5500 HD",    ubicacion:"Electrocardiografía" },
  { nombre:"Monitor Holter 24h",         marca:"Mortara",   modelo:"H3+",               ubicacion:"Electrocardiografía" },
  { nombre:"Sistema de prueba de esfuerzo",marca:"GE Healthcare",modelo:"MAC 5500 HD Stress",ubicacion:"Electrocardiografía" },
  { nombre:"Electrocardiógrafo portátil",marca:"Schiller",  modelo:"AT-2 Plus",         ubicacion:"Electrocardiografía" },

  // ── Banco de sangre (7 equipos)
  { nombre:"Agitador de plaquetas",      marca:"Helmer",    modelo:"PF48i",             ubicacion:"Banco de sangre" },
  { nombre:"Refrigerador de sangre",     marca:"Helmer",    modelo:"iB228",             ubicacion:"Banco de sangre" },
  { nombre:"Congelador de plasma",       marca:"Helmer",    modelo:"iPF120",            ubicacion:"Banco de sangre" },
  { nombre:"Analizador de serología",    marca:"Ortho Clinical",modelo:"VITROS 3600",   ubicacion:"Banco de sangre" },
  { nombre:"Centrífuga de bolsas",       marca:"Hettich",   modelo:"Roto Silenta 630",  ubicacion:"Banco de sangre" },
  { nombre:"Selladora de bolsas de sangre",marca:"Fresenius",modelo:"Composeal Mobilea",ubicacion:"Banco de sangre" },
  { nombre:"Analizador de hemoglobina",  marca:"HemoCue",   modelo:"Hb 801",            ubicacion:"Banco de sangre" },

  // ══════════════════════════════════════════════════════
  //  ÁREAS QUIRÚRGICAS
  // ══════════════════════════════════════════════════════

  // ── Quirófano (12 equipos)
  { nombre:"Mesa quirúrgica eléctrica",  marca:"Maquet",    modelo:"Alphamax",          ubicacion:"Quirófano" },
  { nombre:"Mesa quirúrgica eléctrica",  marca:"Trumpf Medical",modelo:"HT-ST",         ubicacion:"Quirófano" },
  { nombre:"Lámpara quirúrgica LED",     marca:"Maquet",    modelo:"PowerLED II 700",   ubicacion:"Quirófano" },
  { nombre:"Lámpara quirúrgica LED",     marca:"Dräger",    modelo:"Polaris 100",       ubicacion:"Quirófano" },
  { nombre:"Monitor de anestesia",       marca:"Dräger",    modelo:"Perseus A500",      ubicacion:"Quirófano" },
  { nombre:"Máquina de anestesia",       marca:"Dräger",    modelo:"Fabius Plus",       ubicacion:"Quirófano" },
  { nombre:"Electrocauterio",            marca:"Erbe",      modelo:"VIO 3",             ubicacion:"Quirófano" },
  { nombre:"Aspirador quirúrgico",       marca:"Medela",    modelo:"Dominant 50",       ubicacion:"Quirófano" },
  { nombre:"Torre de laparoscopia",      marca:"Storz",     modelo:"IMAGE1 S Rubina",   ubicacion:"Quirófano" },
  { nombre:"Monitor multiparámetros",    marca:"GE Healthcare",modelo:"CARESCAPE B450", ubicacion:"Quirófano" },
  { nombre:"Carro de paro",              marca:"Parity",    modelo:"CP-900",            ubicacion:"Quirófano" },
  { nombre:"Calentador de fluidos",      marca:"3M",        modelo:"Level 1 H-1200",    ubicacion:"Quirófano" },

  // ── CEYE (7 equipos)
  { nombre:"Autoclave de vapor pre-vacío",marca:"Tuttnauer",modelo:"3870EL",            ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Autoclave de vapor pre-vacío",marca:"Getinge",  modelo:"GSS66H",            ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Esterilizador de plasma H2O2",marca:"ASP",      modelo:"STERRAD 100NX",     ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Lavadora ultrasónica",       marca:"Miele",     modelo:"PG 8583",           ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Selladora de bolsas",        marca:"Hawo",      modelo:"HPL 630 B",         ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Testigo biológico (lector)", marca:"3M",        modelo:"Attest 490",        ubicacion:"Central de equipos y esterilización (CEYE)" },
  { nombre:"Secadora de instrumental",   marca:"SciCan",    modelo:"HYDRIM L110W",      ubicacion:"Central de equipos y esterilización (CEYE)" },

  // ── Sala de recuperación (8 equipos)
  { nombre:"Monitor multiparámetros",    marca:"Philips",   modelo:"IntelliVue MP70",   ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Monitor multiparámetros",    marca:"Nihon Kohden",modelo:"Life Scope BSM-3562",ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Ventilador de transporte",   marca:"Hamilton Medical",modelo:"T1",           ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Desfibrilador",              marca:"Philips",   modelo:"HeartStart XL+",    ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Bomba de infusión",          marca:"B. Braun",  modelo:"Infusomat Space",   ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Oxímetro de pulso",          marca:"Masimo",    modelo:"Radical-7",         ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Calentador de pacientes",    marca:"3M",        modelo:"Bair Hugger 775",   ubicacion:"Sala de recuperación post-quirúrgica" },
  { nombre:"Carro de paro",              marca:"Parity",    modelo:"CP-700",            ubicacion:"Sala de recuperación post-quirúrgica" },

  // ══════════════════════════════════════════════════════
  //  APOYO HOSPITALARIO
  // ══════════════════════════════════════════════════════

  // ── Farmacia (7 equipos)
  { nombre:"Campana de flujo laminar",   marca:"Esco",      modelo:"AHC-3A1",           ubicacion:"Farmacia" },
  { nombre:"Refrigerador de medicamentos",marca:"Helmer",   modelo:"iLR120",            ubicacion:"Farmacia" },
  { nombre:"Refrigerador de medicamentos",marca:"Haier",    modelo:"HYC-290TF",         ubicacion:"Farmacia" },
  { nombre:"Balanza analítica",          marca:"Mettler Toledo",modelo:"ME303TE",        ubicacion:"Farmacia" },
  { nombre:"Balanza de precisión",       marca:"Ohaus",     modelo:"Pioneer PA513",     ubicacion:"Farmacia" },
  { nombre:"Mezclador de nutrición parenteral",marca:"Baxter",modelo:"Micromix 5",      ubicacion:"Farmacia" },
  { nombre:"Bomba de llenado de jeringa",marca:"B. Braun",  modelo:"Perfusor Compact",  ubicacion:"Farmacia" },

  // ── Almacén general (5 equipos)
  { nombre:"Báscula industrial",         marca:"SECA",      modelo:"877",               ubicacion:"Almacén general" },
  { nombre:"Refrigerador industrial",    marca:"True",      modelo:"T-49-HC",           ubicacion:"Almacén general" },
  { nombre:"Montacargas eléctrico",      marca:"Crown",     modelo:"RC5500",            ubicacion:"Almacén general" },
  { nombre:"Transpaleta eléctrica",      marca:"Crown",     modelo:"WP 3540",           ubicacion:"Almacén general" },
  { nombre:"Escáner de código de barras",marca:"Zebra",     modelo:"DS3608",            ubicacion:"Almacén general" },

  // ── Central de enfermeras general (8 equipos)
  { nombre:"Monitor multiparámetros",    marca:"Mindray",   modelo:"BC-5800",           ubicacion:"Central de enfermeras general" },
  { nombre:"Carro de curación",          marca:"Parity",    modelo:"CC-600",            ubicacion:"Central de enfermeras general" },
  { nombre:"Carro de curación",          marca:"Parity",    modelo:"CC-600",            ubicacion:"Central de enfermeras general" },
  { nombre:"Glucómetro",                 marca:"Accu-Chek", modelo:"Inform II",         ubicacion:"Central de enfermeras general" },
  { nombre:"Tensiómetro digital",        marca:"Welch Allyn",modelo:"ProBP 2000",       ubicacion:"Central de enfermeras general" },
  { nombre:"Nebulizador",                marca:"PARI",      modelo:"PARI TurboBOY N",   ubicacion:"Central de enfermeras general" },
  { nombre:"Bomba de infusión",          marca:"Baxter",    modelo:"Sigma Spectrum",    ubicacion:"Central de enfermeras general" },
  { nombre:"Oxímetro de pulso",          marca:"Nonin",     modelo:"9590",              ubicacion:"Central de enfermeras general" },
];

// Realistic maintenance history templates
const MANT_TEMPLATES = [
  { tipo:"PREVENTIVO",  desc:"Revisión general y calibración de parámetros según protocolo del fabricante" },
  { tipo:"PREVENTIVO",  desc:"Limpieza interna, verificación de sensores y actualización de firmware" },
  { tipo:"CORRECTIVO",  desc:"Reemplazo de sensor defectuoso y ajuste de alarmas" },
  { tipo:"CALIBRACION", desc:"Calibración de parámetros de acuerdo con trazabilidad metrológica CENAM" },
  { tipo:"LIMPIEZA",    desc:"Desinfección de alto nivel y verificación de puertos de conexión" },
  { tipo:"VERIFICACION",desc:"Verificación funcional completa post-mantenimiento preventivo" },
];

async function main() {
  console.log("🏥 Seeding inventario general del hospital…\n");

  let created = 0;
  let skipped = 0;

  for (const eq of EQUIPOS) {
    // Check if already exists (by nombre + ubicacion)
    const exists = await prisma.equipoMedico.findFirst({
      where: { nombre: eq.nombre, ubicacion: eq.ubicacion },
    });
    if (exists) { skipped++; continue; }

    const estado = pick(ESTADOS);
    const adq = rDate(2016, 2023);

    const created_eq = await prisma.equipoMedico.create({
      data: {
        nombre: eq.nombre,
        marca: eq.marca,
        modelo: eq.modelo,
        numeroSerie: serial(eq.marca.substring(0, 3).toUpperCase()),
        fechaAdquisicion: adq,
        ubicacion: eq.ubicacion,
        estado,
        descripcion: `${eq.nombre} ${eq.modelo} — ${eq.ubicacion}`,
      },
    });

    // Add 1-3 maintenance records
    const numMant = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numMant; i++) {
      const tmpl = pick(MANT_TEMPLATES);
      const mantDate = rDate(2021, 2025);
      await prisma.mantenimiento.create({
        data: {
          equipoId: created_eq.id,
          tipo: tmpl.tipo,
          fecha: mantDate,
          descripcion: tmpl.desc,
          tecnico: pick(["Ing. Martínez", "Ing. López", "Téc. García", "Ing. Rodríguez", "Téc. Hernández", "Ing. Pérez"]),
          costo: Math.round((Math.random() * 4500 + 500) * 100) / 100,
          proximoMantenimiento: new Date(mantDate.getTime() + 180 * 24 * 3600 * 1000),
        },
      });
    }

    created++;
    process.stdout.write(`  ✓ ${eq.ubicacion.padEnd(50)} ${eq.nombre}\n`);
  }

  console.log(`\n✅ Equipos creados: ${created}  |  Ya existían: ${skipped}`);
  console.log(`📊 Total general hospital: ${created + skipped} equipos`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
