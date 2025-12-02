// ============================================
// SISTEMA DE CÁLCULO PATRIMONIAL - APOLO
// Implementação usando a engine oficial do Apolo
// ============================================

import {
  databaseGenerate,
  getMontlyTaxaDaAplicacao,
  calculateRpm as calculateRpmOfficial,
  findFirstMillion as findFirstMillionOfficial,
  databasePerYear as databasePerYearOfficial,
  formatarValor,
  type ApoloInput,
  type MontlyResult
} from '@/lib/apoloOfficialEngine';

export interface ApoloFormData {
  currentAge?: number; // Idade atual do usuário
  capitalInicial: number;
  aporte: {
    value: number;
    type: 'montly' | 'yearly';
  };
  taxaDaAplicacao: {
    value: number;
    type: 'montly' | 'yearly';
  };
  periodoDeAplicacao: number; // Em anos (máx 50)
  inflacao: {
    value: number;
    type: 'montly' | 'yearly';
  };
  dynamic: boolean;
  dynamicAportes?: Record<number, number>; // Ano -> Valor anual
  advancedConfiguration: {
    fixInflation: boolean; // Corrige valores pela inflação
    fixInflationOnAporte: boolean; // Corrige aportes pela inflação
    aporteCrescimento: {
      value: boolean; // Ativa crescimento do aporte
      percentage: number; // % de crescimento anual
    };
    impostoDeRenda: {
      value: boolean; // Considera IR
      percentage: number; // % do IR (geralmente 15%)
    };
  };
}

export interface MonthProjection {
  keyIndex: number; // Índice do mês (1 a 600)
  keyYear: number; // Ano (0 a 50)
  month: number; // Mês do ano (0 a 11)
  age: number; // Idade no mês
  deposity: number; // Aporte do mês
  juros: number; // Juros ganhos no mês
  acumulado: number; // Total de aportes até o mês
  jurosAcumulados: number; // Total de juros até o mês
  valueTotal: number; // Patrimônio total nominal
  valuePresente: number; // Patrimônio corrigido pela inflação
  date: Date; // Data do mês
}

export interface ApoloMetrics {
  patrimonioFinal: number;
  rendaPassivaMensal: number;
  primeiroMilhao: MonthProjection | null;
  totalAportado: number;
  totalJuros: number;
  percentualAportes: number;
  percentualJuros: number;
}

// =====================================================
// CONVERSÃO DE DADOS E INTERFACES
// =====================================================

/**
 * Converte ApoloFormData para ApoloInput (formato da engine oficial)
 */
function convertToApoloInput(formData: ApoloFormData): ApoloInput {
  const fixInflation = formData.advancedConfiguration.fixInflation;
  // If Real View (fixInflation), we must assume contributions grow with inflation to maintain constant purchasing power
  const fixInflationOnAporte = fixInflation ? true : formData.advancedConfiguration.fixInflationOnAporte;

  return {
    capitalInicial: formData.capitalInicial,
    periodoDeAplicacao: formData.periodoDeAplicacao,
    aporte: {
      value: formData.aporte.value,
      type: formData.aporte.type
    },
    inflacao: {
      value: formData.inflacao.value,
      type: formData.inflacao.type
    },
    taxaDaAplicacao: {
      value: formData.taxaDaAplicacao.value,
      type: formData.taxaDaAplicacao.type
    },
    impostoDeRenda: {
      value: formData.advancedConfiguration.impostoDeRenda.value,
      percentage: formData.advancedConfiguration.impostoDeRenda.percentage
    },
    fixInflationOnAporte: fixInflationOnAporte,
    fixInflation: fixInflation,
    aporteCrescimento: {
      value: formData.advancedConfiguration.aporteCrescimento.value,
      percentage: formData.advancedConfiguration.aporteCrescimento.percentage
    }
  };
}

/**
 * Converte MontlyResult para MonthProjection
 */
function convertToMonthProjection(result: MontlyResult, currentAge: number): MonthProjection {
  const year = Math.floor((result.keyIndex - 1) / 12);
  const month = (result.keyIndex - 1) % 12;

  return {
    keyIndex: result.keyIndex,
    keyYear: result.keyYear,
    month: month,
    age: currentAge + year,
    deposity: result.deposity,
    juros: result.juros,
    acumulado: result.acumulado,
    jurosAcumulados: result.jurosAcumulados,
    valueTotal: result.valueTotal,
    valuePresente: result.valuePresente,
    date: result.date
  };
}

// =====================================================
// FUNÇÃO PRINCIPAL DE CÁLCULO
// =====================================================

export function calculateApoloProjections(formData: ApoloFormData): MonthProjection[] {
  const currentAge = formData.currentAge || 0;

  // Converte os dados do formulário para o formato da engine oficial
  const apoloInput = convertToApoloInput(formData);

  // Usa a engine oficial para calcular as projeções
  const officialResults = databaseGenerate(apoloInput);

  // Converte os resultados de volta para o formato esperado
  return officialResults.map(result => convertToMonthProjection(result, currentAge));
}

// =====================================================
// FUNÇÕES DE UTILIDADE E MÉTRICAS
// =====================================================

export function patrimonioWithFixInflation(
  projection: MonthProjection,
  fixInflation: boolean
): number {
  return fixInflation ? projection.valuePresente : projection.valueTotal;
}

export function findFirstMillion(
  projections: MonthProjection[],
  fixInflation: boolean
): MonthProjection | null {
  const foundIndex = projections.findIndex(p =>
    patrimonioWithFixInflation(p, fixInflation) >= 1000000
  );

  if (foundIndex === -1) return null;

  // User requested to subtract 1 month from the calculated date
  // "pegar o mês que está dando no calculo - 1 (mês)"
  if (foundIndex > 0) {
    return projections[foundIndex - 1];
  }

  return projections[foundIndex];
}

export function calculateApoloMetrics(
  projections: MonthProjection[],
  formData: ApoloFormData
): ApoloMetrics {
  if (projections.length === 0) {
    return {
      patrimonioFinal: 0,
      rendaPassivaMensal: 0,
      primeiroMilhao: null,
      totalAportado: 0,
      totalJuros: 0,
      percentualAportes: 0,
      percentualJuros: 0,
    };
  }

  const lastProjection = projections[projections.length - 1];
  const fixInflation = formData.advancedConfiguration.fixInflation;

  const patrimonioFinal = patrimonioWithFixInflation(lastProjection, fixInflation);

  // 1. Cálculo da Taxa Mensal Líquida (Ajustada pelo IR)
  let montlyTaxaLiquida = getMontlyTaxaDaAplicacao(
    formData.taxaDaAplicacao.value,
    formData.taxaDaAplicacao.type
  );
  if (formData.advancedConfiguration.impostoDeRenda.value === true) {
    montlyTaxaLiquida = montlyTaxaLiquida * (1 - formData.advancedConfiguration.impostoDeRenda.percentage / 100);
  }

  // 2. Cálculo da Renda Passiva Mensal (RPM)
  const taxaNominalAnual = formData.taxaDaAplicacao.value;
  const inflacaoAnual = formData.inflacao.value;
  const irPercentage = formData.advancedConfiguration.impostoDeRenda.percentage;

  const taxaMensalRealSimplificada = ((taxaNominalAnual - inflacaoAnual) / 100 * (1 - irPercentage / 100)) / 12;
  const rendaPassivaMensal = patrimonioFinal * taxaMensalRealSimplificada;

  // 3. Cálculo das Métricas de Aportes e Juros
  let totalAportado: number;
  let totalJuros: number;
  let percentualAportes: number;
  let percentualJuros: number;

  if (fixInflation) {
    // CENÁRIO REAL
    // Fix: User wants to see Nominal Contributions (Actual Money Spent) even in Real View.
    // This aligns with how 'Juros' is calculated (Real Total - Nominal Contributions).
    totalAportado = lastProjection.acumulado;
    totalJuros = patrimonioFinal - totalAportado;
  } else {
    // CENÁRIO NOMINAL
    totalAportado = lastProjection.acumulado;
    totalJuros = lastProjection.jurosAcumulados;
  }

  const totalBase = fixInflation ? patrimonioFinal : (totalAportado + totalJuros);

  if (totalBase === 0) {
    percentualAportes = 0;
    percentualJuros = 0;
  } else {
    percentualAportes = totalAportado / totalBase;
    percentualJuros = totalJuros / totalBase;
  }

  const primeiroMilhao = findFirstMillion(projections, fixInflation);

  return {
    patrimonioFinal,
    rendaPassivaMensal,
    primeiroMilhao,
    totalAportado,
    totalJuros,
    percentualAportes,
    percentualJuros,
  };
}

export { formatarValor };

export function formatarValorCompleto(valor: number): string {
  return formatarValor(valor, true, 'mil', 'milhões', 'bilhões', 2);
}

export interface YearlyProjection {
  year: number;
  patrimonio: number;
  aportes: number;
  juros: number;
  aportePercent: number;
  jurosPercent: number;
}

export function getYearlyProjections(
  projections: MonthProjection[],
  formData: ApoloFormData
): YearlyProjection[] {
  const yearlyMap = new Map<number, MonthProjection>();
  const fixInflation = formData.advancedConfiguration.fixInflation;

  // Get last month of each year
  projections.forEach(projection => {
    yearlyMap.set(projection.keyYear, projection);
  });

  const yearlyProjections = Array.from(yearlyMap.values())
    .sort((a, b) => a.keyYear - b.keyYear);

  // Convert to YearlyProjection format with percentages
  return yearlyProjections.map(projection => {
    const patrimonio = patrimonioWithFixInflation(projection, fixInflation);

    let aportes: number;
    let juros: number;

    if (fixInflation) {
      // Real View: Use Nominal Contributions
      aportes = projection.acumulado;
      juros = patrimonio - aportes;
    } else {
      // Nominal View
      aportes = projection.acumulado;
      juros = projection.jurosAcumulados;
    }

    const total = fixInflation ? patrimonio : (aportes + juros);

    const aportePercent = total > 0 ? aportes / total : 0;
    const jurosPercent = total > 0 ? juros / total : 0;

    return {
      year: projection.keyYear,
      patrimonio,
      aportes,
      juros,
      aportePercent,
      jurosPercent
    };
  });
}
