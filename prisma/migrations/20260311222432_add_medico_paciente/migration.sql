-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "medicoId" TEXT;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
