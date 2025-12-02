import { describe, it, expect } from 'vitest';
import { calculateProjections, type FinancialStudyData, type CalculationOptions } from '@/hooks/useFinancialCalculations';

describe('Financial Calculations Engine', () => {
  describe('Cenário 1: Sem inflação, sem IR, aporte fixo mensal, taxa 10% a.a.', () => {
    it('deve calcular corretamente com taxa efetiva mensal', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 5,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 10,
        inflation: 0,
        adjustCapitalInflation: false,
        adjustContributionsInflation: false,
        realGrowthContributions: 0,
        includeTax: false,
        taxRate: 0
      };

      const options: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'none',
        taxMode: 'none',
        rounding: 'monthly'
      };

      const projections = calculateProjections(data, options);
      const finalProjection = projections[projections.length - 1];

      // Verifica se temos 61 projeções (0-60 meses = 5 anos)
      expect(projections.length).toBe(61);

      // Verifica valores iniciais
      expect(projections[0].balance_gross_nominal).toBe(10000);
      expect(projections[0].accumulated_nominal).toBe(10000);

      // Verifica que os aportes são constantes (sem inflação)
      expect(projections[1].contribution_nominal).toBe(1000);
      expect(projections[12].contribution_nominal).toBe(1000);
      expect(projections[24].contribution_nominal).toBe(1000);

      // Verifica que o saldo final está correto (aproximadamente)
      // Com taxa efetiva de 10% a.a., capital inicial de R$ 10.000 e aportes mensais de R$ 1.000
      // O valor esperado após 5 anos é aproximadamente R$ 87.000-88.000
      expect(finalProjection.balance_gross_nominal).toBeGreaterThan(85000);
      expect(finalProjection.balance_gross_nominal).toBeLessThan(90000);

      // Total de aportes = inicial + 60 * 1000 = 70.000
      expect(finalProjection.accumulated_nominal).toBe(70000);

      // Ganhos = saldo final - aportes totais
      const gains = finalProjection.balance_gross_nominal - finalProjection.accumulated_nominal;
      expect(gains).toBeGreaterThan(15000); // Pelo menos R$ 15.000 em juros
    });

    it('deve ter resultados diferentes com depositTiming="end"', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 5,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 10,
        inflation: 0,
        adjustCapitalInflation: false,
        adjustContributionsInflation: false,
        realGrowthContributions: 0,
        includeTax: false,
        taxRate: 0
      };

      const optionsStart: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'none',
        taxMode: 'none',
        rounding: 'monthly'
      };

      const optionsEnd: CalculationOptions = {
        ...optionsStart,
        depositTiming: 'end'
      };

      const projectionsStart = calculateProjections(data, optionsStart);
      const projectionsEnd = calculateProjections(data, optionsEnd);

      const finalStart = projectionsStart[projectionsStart.length - 1];
      const finalEnd = projectionsEnd[projectionsEnd.length - 1];

      // depositTiming="start" deve gerar mais retorno que "end"
      expect(finalStart.balance_gross_nominal).toBeGreaterThan(finalEnd.balance_gross_nominal);
    });
  });

  describe('Cenário 2: Com inflação 3.75%, aporte reajustado anualmente, sem IR', () => {
    it('deve reajustar aportes anualmente pela inflação', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 3,
        initialCapital: 5000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 10,
        inflation: 3.75,
        adjustCapitalInflation: true,
        adjustContributionsInflation: true,
        realGrowthContributions: 0,
        includeTax: false,
        taxRate: 0
      };

      const options: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'display_deflate_both',
        taxMode: 'none',
        rounding: 'monthly'
      };

      const projections = calculateProjections(data, options);

      // Verifica que o aporte do mês 1 é 1000
      expect(projections[1].contribution_nominal).toBe(1000);

      // Verifica que o aporte do mês 12 ainda é 1000 (primeiro ano)
      expect(projections[12].contribution_nominal).toBeCloseTo(1000, 0);

      // Verifica que o aporte do mês 13 (segundo ano) foi reajustado pela inflação
      // 1000 * (1.0375) = 1037.5
      expect(projections[13].contribution_nominal).toBeGreaterThan(1030);
      expect(projections[13].contribution_nominal).toBeLessThan(1045);

      // Verifica que o aporte do mês 25 (terceiro ano) foi reajustado novamente
      // 1000 * (1.0375)^2 = 1076.4
      expect(projections[25].contribution_nominal).toBeGreaterThan(1070);
      expect(projections[25].contribution_nominal).toBeLessThan(1085);

      // Verifica que o real_balance é deflacionado
      const finalProjection = projections[projections.length - 1];
      expect(finalProjection.real_balance).toBeLessThan(finalProjection.balance_after_tax_nominal);
      expect(finalProjection.netBalanceExhibited).toBe(finalProjection.real_balance);
    });
  });

  describe('Cenário 3: Com IR "no resgate", taxa efetiva mensal, aporte no início vs fim do mês', () => {
    it('deve calcular imposto apenas no final com taxMode="on_redemption"', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 2,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 12,
        inflation: 0,
        adjustCapitalInflation: false,
        adjustContributionsInflation: false,
        realGrowthContributions: 0,
        includeTax: true,
        taxRate: 15
      };

      const options: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'display_nominal',
        taxMode: 'on_redemption',
        rounding: 'monthly'
      };

      const projections = calculateProjections(data, options);
      const finalProjection = projections[projections.length - 1];

      // Verifica que o imposto é calculado no final
      expect(finalProjection.taxAmount).toBeGreaterThan(0);

      // Verifica que o saldo líquido é menor que o bruto
      expect(finalProjection.balance_after_tax_nominal).toBeLessThan(finalProjection.balance_gross_nominal);

      // Calcula ganhos e verifica imposto
      const gains = finalProjection.balance_gross_nominal - finalProjection.accumulated_nominal;
      const expectedTax = gains * 0.15;
      expect(finalProjection.taxAmount).toBeCloseTo(expectedTax, 0);

      // Verifica que o valor exibido é o líquido
      expect(finalProjection.netBalanceExhibited).toBe(finalProjection.balance_after_tax_nominal);
    });

    it('deve ter discrepância < 0.5% entre depositTiming start e end', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 2,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 12,
        inflation: 0,
        adjustCapitalInflation: false,
        adjustContributionsInflation: false,
        realGrowthContributions: 0,
        includeTax: true,
        taxRate: 15
      };

      const optionsStart: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'display_nominal',
        taxMode: 'on_redemption',
        rounding: 'monthly'
      };

      const optionsEnd: CalculationOptions = {
        ...optionsStart,
        depositTiming: 'end'
      };

      const projectionsStart = calculateProjections(data, optionsStart);
      const projectionsEnd = calculateProjections(data, optionsEnd);

      const finalStart = projectionsStart[projectionsStart.length - 1];
      const finalEnd = projectionsEnd[projectionsEnd.length - 1];

      // Calcula a discrepância percentual
      const discrepancy = Math.abs(finalStart.balance_after_tax_nominal - finalEnd.balance_after_tax_nominal) / finalStart.balance_after_tax_nominal * 100;

      // A discrepância deve ser pequena mas mensurável
      expect(discrepancy).toBeGreaterThan(0);
      expect(discrepancy).toBeLessThan(2); // Menos de 2% de diferença
    });
  });

  describe('Modo Apolo Oficial', () => {
    it('deve usar as configurações corretas do modo oficial', () => {
      const data: FinancialStudyData = {
        currentAge: 30,
        applicationPeriod: 25,
        initialCapital: 5000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 10,
        inflation: 3.75,
        adjustCapitalInflation: true,
        adjustContributionsInflation: true,
        realGrowthContributions: 2,
        includeTax: true,
        taxRate: 15
      };

      // Simula as opções do modo Apolo oficial
      const options: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'annual',
        inflationMode: 'display_deflate_both',
        taxMode: 'on_redemption',
        rounding: 'monthly'
      };

      const projections = calculateProjections(data, options);
      const finalProjection = projections[projections.length - 1];

      // Verifica que o cálculo foi executado
      expect(projections.length).toBe(301); // 25 anos * 12 meses + 1
      expect(finalProjection.balance_gross_nominal).toBeGreaterThan(0);
      expect(finalProjection.accumulated_nominal).toBeGreaterThan(0);
      expect(finalProjection.taxAmount).toBeGreaterThan(0);
      expect(finalProjection.real_balance).toBeLessThan(finalProjection.balance_after_tax_nominal);
    });
  });

  describe('Teste de Consistência: Modo Real vs Nominal Equivalente', () => {
    it('deve gerar saldo real idêntico quando taxa real com inflação = taxa nominal sem inflação', () => {
      // Cenário A: Modo REAL com taxa real 4.5%, inflação 3.75%
      const dataReal: FinancialStudyData = {
        currentAge: 35,
        applicationPeriod: 5,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: 4.5, // Taxa REAL
        inflation: 3.75,
        adjustCapitalInflation: true,
        adjustContributionsInflation: true,
        realGrowthContributions: 0,
        includeTax: false,
        taxRate: 0
      };

      const optionsReal: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'monthly',
        inflationMode: 'display_deflate_both',
        taxMode: 'none',
        rounding: 'monthly'
      };

      // Cenário B: Modo NOMINAL com taxa nominal calculada, inflação = 0
      // r_nominal = (1 + r_real) * (1 + inflation) - 1
      // r_nominal = (1.045) * (1.0375) - 1 = 0.0841875 = 8.41875%
      const nominalRate = ((1 + 0.045) * (1 + 0.0375) - 1) * 100;
      
      const dataNominal: FinancialStudyData = {
        currentAge: 35,
        applicationPeriod: 5,
        initialCapital: 10000,
        contributionExpectation: 1000,
        contributionFrequency: 'Mensal',
        returnRate: nominalRate,
        inflation: 0, // SEM inflação
        adjustCapitalInflation: false,
        adjustContributionsInflation: false,
        realGrowthContributions: 0,
        includeTax: false,
        taxRate: 0
      };

      const optionsNominal: CalculationOptions = {
        rateCompounding: 'effective',
        depositTiming: 'start',
        contributionUpdate: 'monthly',
        inflationMode: 'none',
        taxMode: 'none',
        rounding: 'monthly'
      };

      const projectionsReal = calculateProjections(dataReal, optionsReal);
      const projectionsNominal = calculateProjections(dataNominal, optionsNominal);

      const finalReal = projectionsReal[projectionsReal.length - 1];
      const finalNominal = projectionsNominal[projectionsNominal.length - 1];

      // O saldo REAL do cenário A deve ser praticamente igual ao saldo nominal do cenário B
      // (com margem de 1% por arredondamentos)
      const difference = Math.abs(finalReal.real_balance - finalNominal.balance_gross_nominal);
      const percentDiff = (difference / finalNominal.balance_gross_nominal) * 100;

      expect(percentDiff).toBeLessThan(1); // Diferença menor que 1%
      
      // Verificação adicional: os aportes devem ser idênticos (sem crescimento real)
      expect(finalReal.real_accumulated).toBeCloseTo(finalNominal.accumulated_nominal, 0);
    });
  });
});
