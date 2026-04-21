-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Recurrencia" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'JEFE_BIOMEDICA';

-- CreateTable
CREATE TABLE "tareas_mantenimiento" (
    "id" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "asignadoAId" TEXT,
    "asignadoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoMantenimiento" NOT NULL DEFAULT 'PREVENTIVO',
    "descripcion" TEXT,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "recurrencia" "Recurrencia",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tareas_mantenimiento" ADD CONSTRAINT "tareas_mantenimiento_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos_medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_mantenimiento" ADD CONSTRAINT "tareas_mantenimiento_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_mantenimiento" ADD CONSTRAINT "tareas_mantenimiento_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
