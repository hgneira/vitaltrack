// Risk score calculation for medical devices
// Returns { nivel: 'BAJO' | 'MODERADO' | 'ALTO', score: number, factores: string[] }

export type NivelRiesgo = "BAJO" | "MODERADO" | "ALTO";

export interface RiesgoResult {
  nivel: NivelRiesgo;
  score: number;
  factores: string[];
}

interface RiesgoInput {
  fechaAdquisicion: Date | null;
  vidaUtilAnios: number;
  estado: string;
  correctivos: number;
  diasDesdeUltimoPreventivo: number | null; // null = never
  mantenimientosVencidos: number;
}

export function calcularRiesgo(input: RiesgoInput): RiesgoResult {
  let score = 0;
  const factores: string[] = [];

  // 1. Age vs useful life (max 30 pts)
  if (input.fechaAdquisicion) {
    const anosUso = (Date.now() - input.fechaAdquisicion.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const pct = anosUso / input.vidaUtilAnios;
    if (pct >= 1.0) {
      score += 30;
      factores.push("Vida útil agotada");
    } else if (pct >= 0.8) {
      score += 20;
      factores.push("Próximo a fin de vida útil (≥80%)");
    } else if (pct >= 0.6) {
      score += 10;
      factores.push("Más de 60% de vida útil consumida");
    }
  }

  // 2. Corrective maintenances / failures (max 30 pts)
  if (input.correctivos >= 5) {
    score += 30;
    factores.push(`${input.correctivos} fallas registradas (alto)`);
  } else if (input.correctivos >= 3) {
    score += 20;
    factores.push(`${input.correctivos} fallas registradas (moderado)`);
  } else if (input.correctivos >= 1) {
    score += 10;
    factores.push(`${input.correctivos} falla(s) registrada(s)`);
  }

  // 3. Days since last preventive (max 20 pts)
  if (input.diasDesdeUltimoPreventivo === null) {
    score += 20;
    factores.push("Sin mantenimiento preventivo registrado");
  } else if (input.diasDesdeUltimoPreventivo > 365) {
    score += 20;
    factores.push("Sin preventivo en más de 1 año");
  } else if (input.diasDesdeUltimoPreventivo > 180) {
    score += 10;
    factores.push("Sin preventivo en más de 6 meses");
  }

  // 4. Overdue maintenances (max 15 pts)
  if (input.mantenimientosVencidos >= 3) {
    score += 15;
    factores.push(`${input.mantenimientosVencidos} mantenimientos vencidos`);
  } else if (input.mantenimientosVencidos >= 1) {
    score += 8;
    factores.push(`${input.mantenimientosVencidos} mantenimiento(s) vencido(s)`);
  }

  // 5. Current state (max 5 pts)
  if (input.estado === "FUERA_DE_SERVICIO") {
    score += 5;
    factores.push("Fuera de servicio");
  } else if (input.estado === "EN_MANTENIMIENTO") {
    score += 3;
    factores.push("En mantenimiento");
  }

  // Determine level
  let nivel: NivelRiesgo;
  if (score >= 50) {
    nivel = "ALTO";
  } else if (score >= 25) {
    nivel = "MODERADO";
  } else {
    nivel = "BAJO";
  }

  return { nivel, score: Math.min(score, 100), factores };
}
