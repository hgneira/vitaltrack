import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const AREA = process.env.AREA;
  if (!AREA) throw new Error("Falta AREA env var");

  // Get all equipment in the area
  const equipos = await prisma.equipoMedico.findMany({
    where: { ubicacion: AREA },
    include: { documentos: { include: { subidoPor: { select: { id: true } } } } },
  });

  console.log(`Equipos en "${AREA}":`);
  equipos.forEach(e => console.log(` - ${e.nombre} (${e.numeroSerie}): ${e.documentos.length} manuales`));

  // Group by nombre
  const grupos = {};
  for (const eq of equipos) {
    if (!grupos[eq.nombre]) grupos[eq.nombre] = [];
    grupos[eq.nombre].push(eq);
  }

  let totalCopiados = 0;

  for (const [nombre, grupo] of Object.entries(grupos)) {
    if (grupo.length < 2) continue;

    // Find the one with documents
    const conDocs = grupo.filter(e => e.documentos.length > 0);
    if (conDocs.length === 0) { console.log(`\n⚠ "${nombre}": ninguno tiene manuales`); continue; }

    // Collect all unique docs across the group
    const todosLosDocs = conDocs.flatMap(e => e.documentos);
    const uniqueDocs = todosLosDocs.filter((d, i, arr) => arr.findIndex(x => x.url === d.url) === i);

    console.log(`\n"${nombre}": copiando ${uniqueDocs.length} manuales a ${grupo.length - 1} equipos...`);

    for (const eq of grupo) {
      for (const doc of uniqueDocs) {
        const yaExiste = eq.documentos.some(d => d.url === doc.url);
        if (yaExiste) continue;
        await prisma.documentoEquipo.create({
          data: { equipoId: eq.id, tipo: doc.tipo, nombre: doc.nombre, url: doc.url, subidoPorId: doc.subidoPor.id },
        });
        totalCopiados++;
        console.log(`  ✓ ${eq.numeroSerie}: "${doc.nombre}"`);
      }
    }
  }

  console.log(`\n✅ Total manuales copiados: ${totalCopiados}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
