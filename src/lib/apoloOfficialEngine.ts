// Lógica de Cálculos Financeiros do Apolo
// Adaptada para ser independente do Angular/RxJS, utilizando parâmetros de entrada.

import moment from 'moment';

// 1. Funções de Conversão de Taxas (Anual/Mensal)
// Estas funções convertem as taxas de aporte, inflação e aplicação para o formato mensal,
// que é o usado no cálculo principal.

/**
 * Converte o valor do aporte para o valor mensal.
 * @param aporteValue Valor do aporte.
 * @param aporteType Tipo do aporte ('montly' ou 'yearly').
 * @returns Valor do aporte mensal.
 */
export function getMontlyAporte(aporteValue: number, aporteType: string): number {
    if (aporteType === 'yearly') {
        return aporteValue / 12;
    }
    return aporteValue;
}

/**
 * Converte a taxa de inflação para o formato mensal.
 * @param inflacaoValue Valor da inflação.
 * @param inflacaoType Tipo da inflação ('montly' ou 'yearly').
 * @returns Taxa de inflação mensal (em porcentagem).
 */
export function getMontlyInflation(inflacaoValue: number, inflacaoType: string): number {
    if (inflacaoType === 'yearly') {
        // Fórmula de conversão de taxa anual para mensal: ((1 + taxa_anual/100)^(1/12) - 1) * 100
        return (Math.pow(1 + inflacaoValue / 100, 1 / 12) - 1) * 100;
    }
    return inflacaoValue;
}

/**
 * Converte a taxa de aplicação para o formato mensal.
 * @param taxaAplicacaoValue Valor da taxa de aplicação.
 * @param taxaAplicacaoType Tipo da taxa de aplicação ('montly' ou 'yearly').
 * @returns Taxa de aplicação mensal (em porcentagem).
 */
export function getMontlyTaxaDaAplicacao(taxaAplicacaoValue: number, taxaAplicacaoType: string): number {
    if (taxaAplicacaoType === 'yearly') {
        // Fórmula de conversão de taxa anual para mensal: ((1 + taxa_anual/100)^(1/12) - 1) * 100
        return (Math.pow(1 + taxaAplicacaoValue / 100, 1 / 12) - 1) * 100;
    }
    return taxaAplicacaoValue;
}

// 2. Função Principal de Geração da Base de Dados (Cálculo Mês a Mês)

export interface ApoloInput {
    capitalInicial: number;
    periodoDeAplicacao: number; // em anos
    aporte: { value: number; type: 'montly' | 'yearly' };
    inflacao: { value: number; type: 'montly' | 'yearly' };
    taxaDaAplicacao: { value: number; type: 'montly' | 'yearly' };
    impostoDeRenda: { value: boolean; percentage: number };
    fixInflationOnAporte: boolean;
    fixInflation: boolean;
    aporteCrescimento: { value: boolean; percentage: number };
}

export interface MontlyResult {
    keyIndex: number; // Mês do cálculo (1 a N)
    keyYear: number; // Ano do cálculo (0 a N-1)
    valueTotal: number; // Patrimônio Total (nominal)
    valuePresente: number; // Patrimônio a Valor Presente (real)
    deposity: number; // Aporte do mês
    acumulado: number; // Total aportado (sem juros)
    jurosAcumulados: number; // Juros acumulados (nominal)
    juros: number; // Juros do mês
    date: Date; // Data do mês
}

/**
 * Gera a base de dados de projeção financeira mês a mês.
 * @param input Objeto com todos os parâmetros de entrada do cálculo.
 * @returns Array de resultados mensais.
 */
export function databaseGenerate(input: ApoloInput): MontlyResult[] {
    const totalMonths = input.periodoDeAplicacao * 12;
    const montlyList: MontlyResult[] = [];

    let acumulado = input.capitalInicial;
    let montlyTaxa = getMontlyTaxaDaAplicacao(input.taxaDaAplicacao.value, input.taxaDaAplicacao.type);
    const montlyInflation = getMontlyInflation(input.inflacao.value, input.inflacao.type);
    let montlyAporte = getMontlyAporte(input.aporte.value, input.aporte.type);
    let jurosAcumulados = 0;

    // 1. Ajuste da Taxa de Aplicação pelo Imposto de Renda
    if (input.impostoDeRenda.value === true) {
        montlyTaxa = montlyTaxa * (1 - input.impostoDeRenda.percentage / 100);
    }

    // 2. Cálculo Mês a Mês
    let currentNominalAporte = montlyAporte; // Aporte nominal base

    for (let keyIndex = 1; keyIndex <= totalMonths; keyIndex++) {
        const keyYear = Math.floor((keyIndex - 1) / 12);

        // Atualiza o aporte nominal com inflação e crescimento MÊS A MÊS (acumulativo)
        // Lógica "Apolo Original" (Definitiva):
        // 1. Combina taxas ANUAIS multiplicativamente: (1+Inf)*(1+Gro)
        // 2. Converte para mensal: CombinedAnnual^(1/12) - 1
        // 3. Aplica desde o Mês 1

        let combinedAnnualFactor = 1;

        // 2.1. Fator de Inflação (se ativado)
        if (input.fixInflationOnAporte === true) {
            combinedAnnualFactor *= (1 + input.inflacao.value / 100);
        }

        // 2.2. Fator de Crescimento (se ativado)
        if (input.aporteCrescimento.value === true) {
            combinedAnnualFactor *= (1 + input.aporteCrescimento.percentage / 100);
        }

        // Calcula a taxa mensal efetiva combinada
        const combinedMonthlyRate = Math.pow(combinedAnnualFactor, 1 / 12) - 1;

        // Aplica a correção (Multiplicativa pelo fator mensal combinado)
        if (combinedMonthlyRate > 0) {
            currentNominalAporte = currentNominalAporte * (1 + combinedMonthlyRate);
        }

        let deposity = currentNominalAporte;
        let lastValueTotal = montlyList.length > 0 ? montlyList[montlyList.length - 1].valueTotal : input.capitalInicial;
        let lastValuePresente = montlyList.length > 0 ? montlyList[montlyList.length - 1].valuePresente : input.capitalInicial;

        // 2.3. Cálculo dos Juros e Acumulação
        const juros = lastValueTotal * (montlyTaxa / 100);
        acumulado = acumulado + deposity;
        jurosAcumulados = jurosAcumulados + juros;
        const valueTotal = lastValueTotal + juros + deposity;

        // 2.4. Cálculo do Valor Presente (Real)
        // O cálculo do Apolo é:
        // valuePresente = (lastValuePresente + deposity) * (1 + ((1 + montlyTaxa / 100) / (1 + montlyInflation / 100) - 1));
        // O termo ((1 + montlyTaxa / 100) / (1 + montlyInflation / 100) - 1) é a taxa real de juros (Fisher).
        const taxaReal = ((1 + montlyTaxa / 100) / (1 + montlyInflation / 100) - 1);
        lastValuePresente = (lastValuePresente + deposity) * (1 + taxaReal);
        const valuePresente = lastValuePresente;

        // 2.5. Data
        const date = moment().add(keyIndex, 'months').toDate();

        montlyList.push({
            keyIndex,
            keyYear,
            valueTotal,
            valuePresente,
            deposity,
            acumulado,
            jurosAcumulados,
            juros,
            date,
        });
    }

    return montlyList;
}

// 3. Funções de Formatação (Adaptadas de utils.ts)

/**
 * Formata um valor numérico para exibição, incluindo formatação de moeda e abreviações (mil, mi, bi).
 * @param valor O valor numérico a ser formatado.
 * @param moeda Indica se deve usar formato de moeda (R$). Padrão: true.
 * @param simboloMil Símbolo para mil. Padrão: 'mil'.
 * @param simboloMilhao Símbolo para milhão. Padrão: 'mi'.
 * @param simboloBilhao Símbolo para bilhão. Padrão: 'bi'.
 * @param maximoCasasDecimais Máximo de casas decimais. Padrão: 2.
 * @returns O valor formatado como string.
 */
export function formatarValor(valor: number, moeda: boolean = true, simboloMil: string = 'mil', simboloMilhao: string = 'mi', simboloBilhao: string = 'bi', maximoCasasDecimais: number = 2): string {
    if (valor === null || valor === undefined) {
        return '-';
    }

    const valorAbsoluto = Math.abs(valor);
    let divisor: number = 1.0;
    let simbolo: string = '';

    if (valorAbsoluto >= 1000000000.0) {
        divisor = 1000000000.0;
        simbolo = ' ' + simboloBilhao;
    } else if (valorAbsoluto >= 1000000.0) {
        divisor = 1000000.0;
        simbolo = ' ' + simboloMilhao;
    } else if (valorAbsoluto >= 1000.0) {
        divisor = 1000.0;
        simbolo = ' ' + simboloMil;
    }

    let estilo: Intl.NumberFormatOptions;
    if (moeda) {
        estilo = { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 2 };
    } else {
        estilo = { style: 'decimal', maximumFractionDigits: maximoCasasDecimais };
    }

    let novoValor: number = valor / divisor;
    // Usa toLocaleString para formatação de números em pt-BR
    return `${novoValor.toLocaleString('pt-BR', estilo)}${simbolo}`;
}

// 4. Funções de Resultado (RPM, Primeiro Milhão, Projeção Anual)

/**
 * Calcula a Renda Passiva Mensal (RPM) no último item da projeção.
 * @param lastItem O último item da lista de resultados mensais.
 * @param montlyTaxaDaAplicacao Taxa de aplicação mensal (em porcentagem, já líquida de IR).
 * @param fixInflation Indica se o patrimônio deve ser considerado a valor presente (real).
 * @returns O valor da RPM.
 */
export function calculateRpm(lastItem: MontlyResult, montlyTaxaDaAplicacao: number, fixInflation: boolean): number {
    // O patrimônio a ser usado é o Corrigido pela Inflação (valuePresente) para o cenário Real,
    // ou o Patrimônio Total (valueTotal) para o cenário Nominal.
    const patrimonio = fixInflation ? lastItem.valuePresente : lastItem.valueTotal;

    // Fórmula correta de RPM: Patrimônio * Taxa Mensal Líquida
    // A taxa mensal já está em porcentagem, então divide por 100.
    return patrimonio * (montlyTaxaDaAplicacao / 100);
}

/**
 * Encontra o primeiro mês em que o patrimônio atinge 1 milhão.
 * @param results Lista de resultados mensais.
 * @param fixInflation Indica se o patrimônio deve ser considerado a valor presente (real).
 * @returns O item do mês em que o milhão foi atingido, ou undefined.
 */
export function findFirstMillion(results: MontlyResult[], fixInflation: boolean): MontlyResult | undefined {
    return results.find(
        (item) => (fixInflation ? item.valuePresente : item.valueTotal) >= 1000000
    );
}

/**
 * Agrupa os resultados mensais por ano.
 * @param results Lista de resultados mensais.
 * @returns Lista de resultados anuais (o último mês de cada ano).
 */
export function databasePerYear(results: MontlyResult[]): MontlyResult[] {
    const annualResultsMap = results.reduce((prev, curr) => {
        prev[curr.keyYear] = curr;
        return prev;
    }, {} as { [key: number]: MontlyResult });

    return Object.values(annualResultsMap);
}
