import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ORIGEN_UBICACION = process.env.ORIGEN ?? "Cubículo de Observación General 1";
  const DESTINOS_RAW = process.env.DESTINOS ?? "";

  // Get equipment from source cubicle that have documents
  const origen = await prisma.equipoMedico.findMany({
    where: { ubicacion: ORIGEN_UBICACION },
    include: {
      documentos: { include: { subidoPor: { select: { id: true } } } },
    },
  });

  console.log(`Equipos en "${ORIGEN_UBICACION}":`);
  origen.forEach(e => console.log(` - ${e.nombre}: ${e.documentos.length} manuales`));

  const equiposConDocs = origen.filter(e => e.documentos.length > 0);
  if (equiposConDocs.length === 0) {
    console.log("No hay manuales en Cubículo 1 para copiar.");
    return;
  }

  const destinos = DESTINOS_RAW ? DESTINOS_RAW.split("|") : [
    "Cubículo de Observación General 2",
    "Cubículo de Observación General 3",
    "Cubículo de Observación General 4",
    "Cubículo de Observación General 5",
    "Cubículo de Observación General 6",
    "Cubículo de Aislamiento 1",
    "Cubículo de Aislamiento 2",
  ];

  let totalCopiados = 0;

  for (const destino of destinos) {
    const equiposDestino = await prisma.equipoMedico.findMany({
      where: { ubicacion: destino },
      include: { documentos: true },
    });

    for (const eqOrigen of equiposConDocs) {
      // Match by equipment name (normalize to ignore trailing numbers)
      const baseName = eqOrigen.nombre.replace(/\s+\d+$/, "").toLowerCase();
      const eqDestino = equiposDestino.find(e =>
        e.nombre.replace(/\s+\d+$/, "").toLowerCase() === baseName ||
        e.nombre.toLowerCase() === eqOrigen.nombre.toLowerCase()
      );

      if (!eqDestino) continue;

      for (const doc of eqOrigen.documentos) {
        // Skip if already has a doc with same URL
        const yaExiste = eqDestino.documentos.some(d => d.url === doc.url);
        if (yaExiste) continue;

        await prisma.documentoEquipo.create({
          data: {
            equipoId: eqDestino.id,
            tipo: doc.tipo,
            nombre: doc.nombre,
            url: doc.url,
            subidoPorId: doc.subidoPor.id,
          },
        });
        totalCopiados++;
        console.log(`  ✓ ${destino} → ${eqDestino.nombre}: "${doc.nombre}"`);
      }
    }
  }

  console.log(`\n✅ Total manuales copiados: ${totalCopiados}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
