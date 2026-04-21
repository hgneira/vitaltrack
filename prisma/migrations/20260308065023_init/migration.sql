-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'MEDICO', 'ENFERMERIA', 'INGENIERIA_BIOMEDICA', 'RECEPCION', 'LIMPIEZA', 'FARMACIA', 'MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PROGRAMADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('ACTIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "TipoMantenimiento" AS ENUM ('PREVENTIVO', 'CORRECTIVO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "alergias" TEXT,
    "antecedentes" TEXT,
    "contactoEmergencia" TEXT,
    "telefonoEmergencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PROGRAMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedientes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,

    CONSTRAINT "expedientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_soap" (
    "id" TEXT NOT NULL,
    "subjetivo" TEXT,
    "objetivo" TEXT,
    "analisis" TEXT,
    "plan" TEXT,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "evolucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expedienteId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,

    CONSTRAINT "notas_soap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos_medicos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "fechaAdquisicion" TIMESTAMP(3),
    "ubicacion" TEXT,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimientos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMantenimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "tecnico" TEXT,
    "costo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipoId" TEXT NOT NULL,

    CONSTRAINT "mantenimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_pacienteId_key" ON "expedientes"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_medicos_numeroSerie_key" ON "equipos_medicos"("numeroSerie");

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_soap" ADD CONSTRAINT "notas_soap_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_soap" ADD CONSTRAINT "notas_soap_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos_medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
