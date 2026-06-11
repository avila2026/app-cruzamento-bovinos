/**
 * Motor de Cruzamento — CattleGen
 *
 * Regras:
 * - Nunca somar escalas heterogêneas.
 * - Valor esperado da progênie = (sire + dam) / 2, traço equivalente, mesmo programa/base.
 * - Score de decisão normalizado e ponderado por objetivo.
 * - Tudo aceita nulo.
 */

import type { EvaluationTrait } from '../types';

export type PoliticaAusencia = 'ESTRITA' | 'MEDIA_DISPONIVEL' | 'IMPUTACAO_MEDIA_PROGRAMA';
export type PerfilObjetivo = 'NOVILHAS' | 'REPOSICAO' | 'TERMINAL';

interface TraitWeight {
  concept_key: string;
  peso: number;
}

/** Pesos por perfil de objetivo */
export const PERFIS: Record<PerfilObjetivo, TraitWeight[]> = {
  NOVILHAS: [
    { concept_key: 'IPP', peso: 1.5 },
    { concept_key: 'PES', peso: 1.2 },
    { concept_key: 'PE_450D', peso: 1.0 },
    { concept_key: 'HP_STAY', peso: 1.2 },
    { concept_key: 'TMD', peso: 0.8 },
    { concept_key: 'PN', peso: 0.8 },
    { concept_key: 'PD', peso: 0.6 },
    { concept_key: 'PS', peso: 0.5 },
    { concept_key: 'AOL', peso: 0.3 },
    { concept_key: 'EGS', peso: 0.2 },
    { concept_key: 'MAR', peso: 0.2 },
  ],
  REPOSICAO: [
    { concept_key: 'TMD', peso: 1.2 },
    { concept_key: 'IPP', peso: 1.0 },
    { concept_key: 'PES', peso: 1.0 },
    { concept_key: 'HP_STAY', peso: 1.0 },
    { concept_key: 'PD', peso: 0.8 },
    { concept_key: 'PS', peso: 0.7 },
    { concept_key: 'PN', peso: 0.7 },
    { concept_key: 'AOL', peso: 0.5 },
    { concept_key: 'EGS', peso: 0.3 },
    { concept_key: 'MAR', peso: 0.3 },
    { concept_key: 'PE_450D', peso: 0.5 },
  ],
  TERMINAL: [
    { concept_key: 'AOL', peso: 1.5 },
    { concept_key: 'EGS', peso: 1.2 },
    { concept_key: 'MAR', peso: 1.2 },
    { concept_key: 'PS', peso: 1.0 },
    { concept_key: 'PD', peso: 0.8 },
    { concept_key: 'PES', peso: 0.6 },
    { concept_key: 'PE_450D', peso: 0.4 },
    { concept_key: 'IPP', peso: 0.3 },
    { concept_key: 'HP_STAY', peso: 0.4 },
    { concept_key: 'TMD', peso: 0.3 },
    { concept_key: 'PN', peso: 0.5 },
  ],
};

/** Limita valor entre 0 e 100 */
function clamp0100(val: number): number {
  return Math.max(0, Math.min(100, val));
}

/** Normaliza um traço para escala 0–100 (maior = melhor) */
export function normalize(trait: EvaluationTrait | null | undefined, stats?: { mean: number; sd: number }): number | null {
  if (!trait) return null;
  // Rank Percentil
  if (trait.rank_type === 'PERCENTIL' && trait.rank_value != null) {
    return clamp0100(100 - trait.rank_value);
  }
  // Rank TOP
  if (trait.rank_type === 'TOP' && trait.rank_value != null) {
    return clamp0100(100 - trait.rank_value);
  }
  // Rank DECA
  if (trait.rank_type === 'DECA' && trait.rank_value != null) {
    return clamp0100((11 - trait.rank_value) * 10);
  }
  // DEP bruta via z-score (mesmo programa, traço, edição)
  if (trait.value != null && stats != null && stats.sd > 0) {
    return clamp0100(50 + 10 * ((trait.value - stats.mean) / stats.sd));
  }
  return null; // ausente
}

/** Retorna o valor esperado da progênie para um traço */
export function expectedProgeny(
  sireTrait: Partial<EvaluationTrait> | null | undefined,
  damTrait: Partial<EvaluationTrait> | null | undefined
): { expectedValue: number | null; confidence: number | null } {
  const sireValue = sireTrait?.value ?? null;
  const damValue = damTrait?.value ?? null;
  const expectedValue =
    sireValue != null && damValue != null ? (sireValue + damValue) / 2 : null;
  const sireAcc = sireTrait?.accuracy ?? null;
  const damAcc = damTrait?.accuracy ?? null;
  const confidence =
    sireAcc != null && damAcc != null ? (sireAcc + damAcc) / 2 : null;
  return { expectedValue, confidence };
}

/** Score para "Peso ao Nascer" — penaliza desvios em qualquer direção (alvo ~ 30-35kg) */
function scorePesoNascer(expectedValue: number, alvoKg = 32): number {
  const desvio = Math.abs(expectedValue - alvoKg);
  const k = 5; // penalidade por kg de desvio
  return clamp0100(100 - k * desvio);
}

export interface TraitResult {
  concept_key: string;
  sireValue: number | null;
  damValue: number | null;
  expectedValue: number | null;
  normalizedScore: number | null;
  weight: number;
  confidence: number | null;
}

export interface CruzamentoResult {
  scoreComposto: number | null;
  confiancaMedia: number | null;
  traits: TraitResult[];
  alertas: string[];
  coveragePct: number;
  politicaUsada: PoliticaAusencia;
}

export function calcularCruzamento(
  sireTraits: Map<string, EvaluationTrait>,
  damTraits: Map<string, EvaluationTrait>,
  perfil: PerfilObjetivo,
  politica: PoliticaAusencia = 'MEDIA_DISPONIVEL',
  consanguinidadePct?: number
): CruzamentoResult {
  const pesos = PERFIS[perfil];
  const results: TraitResult[] = [];
  const alertas: string[] = [];
  let somaScores = 0;
  let somaPesos = 0;
  let somaConfianca = 0;
  let countConfianca = 0;
  let faltantes = 0;
  let obrigatoriosFaltantes = 0;

  // Traços obrigatórios no modo ESTRITA: todos do perfil

  for (const { concept_key, peso } of pesos) {
    const s = sireTraits.get(concept_key);
    const d = damTraits.get(concept_key);

    const sireValue = s?.value ?? null;
    const damValue = d?.value ?? null;
    const { expectedValue, confidence } = expectedProgeny(s, d);

    let normalizedScore: number | null = null;

    if (expectedValue != null) {
      if (concept_key === 'PN') {
        // Peso ao nascer: exceção, penaliza desvio do alvo
        normalizedScore = scorePesoNascer(expectedValue);
      } else {
        // Normaliza usando o rank ou DEP do pai (ou média se ambos existirem)
        const stats = { mean: 0, sd: 1 }; // placeholder; substituir por stats reais
        const sireNorm = normalize(s, stats);
        const damNorm = normalize(d, stats);
        if (sireNorm != null && damNorm != null) {
          normalizedScore = (sireNorm + damNorm) / 2;
        } else if (sireNorm != null) {
          normalizedScore = sireNorm;
        } else if (damNorm != null) {
          normalizedScore = damNorm;
        }
      }
    }

    if (normalizedScore == null) {
      faltantes++;
      if (politica === 'ESTRITA') {
        obrigatoriosFaltantes++;
      } else if (politica === 'IMPUTACAO_MEDIA_PROGRAMA') {
        normalizedScore = 50; // média da população centrada
        alertas.push(`Traço ${concept_key} ausente — imputado com média do programa.`);
      }
    }

    if (normalizedScore != null) {
      somaScores += peso * normalizedScore;
      somaPesos += peso;
    }

    if (confidence != null) {
      somaConfianca += confidence;
      countConfianca++;
    }

    results.push({
      concept_key,
      sireValue,
      damValue,
      expectedValue,
      normalizedScore,
      weight: peso,
      confidence,
    });
  }

  // Score composto
  let scoreComposto: number | null = null;
  if (politica === 'ESTRITA' && obrigatoriosFaltantes > 0) {
    scoreComposto = null;
    alertas.push(`Modo ESTRITA: ${obrigatoriosFaltantes} traço(s) obrigatório(s) ausente(s). Score não calculado.`);
  } else if (somaPesos > 0) {
    scoreComposto = somaScores / somaPesos;
  }

  // Confiança média
  const confiancaMedia = countConfianca > 0 ? somaConfianca / countConfianca : null;

  // Alertas de confiabilidade
  if (confiancaMedia != null && confiancaMedia < 50) {
    alertas.push(`Confiança média baixa (${confiancaMedia.toFixed(1)}%). Verifique acurácias das avaliações.`);
  } else if (confiancaMedia != null && confiancaMedia < 70) {
    alertas.push(`Confiança média razoável (${confiancaMedia.toFixed(1)}%).`);
  }

  // Alerta de consanguinidade
  if (consanguinidadePct != null) {
    if (consanguinidadePct > 12.5) {
      alertas.push(`Consanguinidade ALTA (${consanguinidadePct}%). Acasalamento não recomendado.`);
    } else if (consanguinidadePct > 6.25) {
      alertas.push(`Consanguinidade moderada (${consanguinidadePct}%). Atenção.`);
    }
  }

  // Cobertura
  const totalTraços = pesos.length;
  const coveragePct = totalTraços > 0 ? ((totalTraços - faltantes) / totalTraços) * 100 : 0;
  if (faltantes > 0) {
    alertas.push(`${faltantes} de ${totalTraços} traços ausentes. Política: ${politica}.`);
  }

  return {
    scoreComposto,
    confiancaMedia,
    traits: results,
    alertas,
    coveragePct,
    politicaUsada: politica,
  };
}

/** Agrupa resultados por grupo de traço */
export function agruparPorGrupo(
  traits: TraitResult[],
  groupMap: Record<string, string>
): Record<string, TraitResult[]> {
  const grupos: Record<string, TraitResult[]> = {};
  for (const t of traits) {
    const g = groupMap[t.concept_key] ?? 'OUTROS';
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(t);
  }
  return grupos;
}
