-- CreateEnum
CREATE TYPE "TipoAccion" AS ENUM ('TOMAR', 'MOVER', 'DEVOLVER', 'REPORTAR_PROBLEMA');

-- CreateTable
CREATE TABLE "acciones_dispositivo" (
    "id" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoAccion" NOT NULL,
    "area" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acciones_dispositivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "acciones_dispositivo" ADD CONSTRAINT "acciones_dispositivo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos_medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_dispositivo" ADD CONSTRAINT "acciones_dispositivo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
