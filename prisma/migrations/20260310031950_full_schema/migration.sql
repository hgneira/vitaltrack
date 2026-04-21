-- CreateEnum
CREATE TYPE "TipoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'PERMISO', 'VACACIONES', 'INCAPACIDAD');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('SALARIO', 'BONO', 'DESCUENTO');

-- CreateEnum
CREATE TYPE "TipoArea" AS ENUM ('CUARTO_PACIENTE', 'BANO', 'PASILLO', 'SALA_ESPERA', 'QUIROFANO', 'LABORATORIO', 'FARMACIA', 'ADMINISTRACION', 'CAFETERIA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoRegistro" AS ENUM ('LIMPIEZA', 'MANTENIMIENTO_GENERAL', 'INSPECCION');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('LIMPIEZA', 'MANTENIMIENTO', 'EMERGENCIA');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- AlterTable
ALTER TABLE "citas" ADD COLUMN     "notas" TEXT;

-- AlterTable
ALTER TABLE "equipos_medicos" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "mantenimientos" ADD COLUMN     "proximoMantenimiento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "apellidos" TEXT,
ADD COLUMN     "especialidad" TEXT,
ADD COLUMN     "telefono" TEXT,
ALTER COLUMN "activo" SET DEFAULT false;

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoAsistencia" NOT NULL DEFAULT 'PRESENTE',
    "horaEntrada" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_trabajo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "horarios_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoPago" NOT NULL DEFAULT 'SALARIO',
    "descripcion" TEXT,
    "fechaPago" TIMESTAMP(3),
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_hospital" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "piso" TEXT,
    "tipo" "TipoArea" NOT NULL DEFAULT 'OTRO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_limpieza" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoRegistro" NOT NULL DEFAULT 'LIMPIEZA',
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_limpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "areaId" TEXT,
    "tipo" "TipoAlerta" NOT NULL DEFAULT 'LIMPIEZA',
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'PENDIENTE',
    "creadaPorId" TEXT NOT NULL,
    "asignadaAId" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "principioActivo" TEXT,
    "presentacion" TEXT,
    "concentracion" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 5,
    "unidad" TEXT,
    "precio" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_medicamentos" (
    "id" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION,
    "motivo" TEXT,
    "pacienteNombre" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_userId_fecha_key" ON "asistencias"("userId", "fecha");

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_trabajo" ADD CONSTRAINT "horarios_trabajo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_limpieza" ADD CONSTRAINT "registros_limpieza_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas_hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_limpieza" ADD CONSTRAINT "registros_limpieza_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas_hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_asignadaAId_fkey" FOREIGN KEY ("asignadaAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_medicamentos" ADD CONSTRAINT "movimientos_medicamentos_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_medicamentos" ADD CONSTRAINT "movimientos_medicamentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
