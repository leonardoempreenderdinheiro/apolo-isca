
import { describe, it, expect } from 'vitest';
import { calculateApoloMetrics, ApoloFormData } from '../hooks/useApoloCalculations';

describe('Apolo Metrics Reproduction', () => {
  it('should return hardcoded values when fixInflation is true, regardless of input', () => {
    // Input 1: Small capital
    const input1: ApoloFormData = {
      capitalInicial: 1000,
      periodoDeAplicacao: 10,
      aporte: { value: 100, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 5, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: true, // This triggers the hardcoded values
        fixInflationOnAporte: false,
        aporteCrescimento: { value: false, percentage: 0 },
        impostoDeRenda: { value: false, percentage: 0 },
      },
    };

    const metrics1 = calculateApoloMetrics([], input1);
    // Note: calculateApoloMetrics expects projections, but the hardcoded values are applied 
    // inside the function based on formData, seemingly ignoring projections for those specific fields?
    // Wait, looking at the code:
    // if (fixInflation) {
    //    rendaPassivaMensal = 274.00;
    //    totalAportado = 250934.04;
    //    totalJuros = 400880.38;
    // }
    // It DOES NOT use projections for these values in this block.
    // However, it does check `if (projections.length === 0) return ...` at the start.
    // So I need to provide some dummy projections.

    // Let's generate projections first to be safe and realistic
    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections1 = calculateApoloProjections(input1);
    const result1 = calculateApoloMetrics(projections1, input1);

    // Input 2: Large capital (Should definitely have different results)
    const input2: ApoloFormData = {
      ...input1,
      capitalInicial: 1000000, // 1000x larger
      aporte: { value: 50000, type: 'montly' },
    };
    const projections2 = calculateApoloProjections(input2);
    const result2 = calculateApoloMetrics(projections2, input2);

    console.log('Result 1 (Small Input):', {
      rendaPassivaMensal: result1.rendaPassivaMensal,
      totalAportado: result1.totalAportado,
      totalJuros: result1.totalJuros
    });

    console.log('Result 2 (Large Input):', {
      rendaPassivaMensal: result2.rendaPassivaMensal,
      totalAportado: result2.totalAportado,
      totalJuros: result2.totalJuros
    });

    // Assertion: The values should be DIFFERENT for different inputs.
    // With the fix, they should NO LONGER be equal to the hardcoded values.

    // Check that they are NOT the hardcoded values
    expect(result1.rendaPassivaMensal).not.toBe(274.00);
    expect(result1.totalAportado).not.toBe(250934.04);

    // Check that different inputs produce different results
    expect(result1.rendaPassivaMensal).not.toBe(result2.rendaPassivaMensal);
    expect(result1.totalAportado).not.toBe(result2.totalAportado);
    expect(result1.totalJuros).not.toBe(result2.totalJuros);

    // Check that values are reasonable and match the corrected engine logic
    // For Input 1 (Small):
    // 1k initial, 100/mo, 10 years.
    // Inflation 5%, Growth 0%.
    // Aporte is constant 100 (Nominal).
    // Real Total should be less than Nominal.

    // For Input 2 (Large):
    // 1M initial, 50k/mo.
    // This doesn't match the User's Real Case inputs (which were 10k initial, 1k/mo, 20y).
    // Let's add a specific test case for the User's Real Case to be sure.

    expect(result1.rendaPassivaMensal).toBeGreaterThan(0);
  });

  it('should match the User Real Case values (approx)', () => {
    const inputRealCase: ApoloFormData = {
      capitalInicial: 10000,
      periodoDeAplicacao: 20,
      aporte: { value: 1000, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 3.75, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: true,
        fixInflationOnAporte: true,
        aporteCrescimento: { value: true, percentage: 1 },
        impostoDeRenda: { value: true, percentage: 15 },
      },
    };

    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections = calculateApoloProjections(inputRealCase);
    const metrics = calculateApoloMetrics(projections, inputRealCase);

    // Expected values based on User's Real Case (and our verification):
    // Patrimônio Real: ~620k - 622k
    // Aportes Nominais: ~406k - 407k
    // Juros: ~214k

    console.log('Real Case Metrics:', metrics);

    expect(metrics.patrimonioFinal).toBeGreaterThan(615000);
    expect(metrics.patrimonioFinal).toBeLessThan(630000);

    expect(metrics.totalAportado).toBeGreaterThan(400000);
    expect(metrics.totalAportado).toBeLessThan(410000);

    expect(metrics.totalJuros).toBeGreaterThan(210000);
    expect(metrics.totalJuros).toBeLessThan(220000);
  });

  it('should match the User Real Case 2 values (approx)', () => {
    const inputRealCase2: ApoloFormData = {
      capitalInicial: 20000,
      periodoDeAplicacao: 25,
      aporte: { value: 2500, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 3.75, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: true,
        fixInflationOnAporte: true,
        aporteCrescimento: { value: true, percentage: 1 },
        impostoDeRenda: { value: true, percentage: 15 },
      },
    };

    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections = calculateApoloProjections(inputRealCase2);
    const metrics = calculateApoloMetrics(projections, inputRealCase2);

    console.log('Real Case 2 Metrics:', metrics);

    // Patrimony: Target R$ 2.409.309,28
    expect(metrics.patrimonioFinal).toBeGreaterThan(2409000);
    expect(metrics.patrimonioFinal).toBeLessThan(2410000);
    expect(metrics.patrimonioFinal).toBeCloseTo(2409309.28, 0); // Check integer part match

    // Capital + Aportes: Target R$ 1.446.373,46
    expect(metrics.totalAportado).toBeCloseTo(1446373.46, 0);

    // Juros: Target R$ 962.935,82
    expect(metrics.totalJuros).toBeCloseTo(962935.82, 0);

    // RPM: Target R$ 10.666,21
    expect(metrics.rendaPassivaMensal).toBeCloseTo(10666.21, 0);

    // Check if RPM calculation matches the simplified formula exactly relative to Patrimony
    // RPM = Patrimony * Rate
    const rate = ((10 - 3.75) / 100 * (1 - 0.15)) / 12;
    const expectedRPM = metrics.patrimonioFinal * rate;
    expect(metrics.rendaPassivaMensal).toBeCloseTo(expectedRPM, 2);
  });

  it('should match RPM for Case 1 (Real, IR Off)', () => {
    const input: ApoloFormData = {
      capitalInicial: 20000,
      periodoDeAplicacao: 25,
      aporte: { value: 2500, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 3.75, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: true,
        fixInflationOnAporte: true,
        aporteCrescimento: { value: true, percentage: 1 },
        impostoDeRenda: { value: false, percentage: 15 } // IR OFF
      },
    };
    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections = calculateApoloProjections(input);
    const metrics = calculateApoloMetrics(projections, input);

    // Expected RPM: 12.857,88
    expect(metrics.rendaPassivaMensal).toBeCloseTo(12857.88, 0);
  });

  it('should match RPM for Case 2 (Real, No Growth, IR Off)', () => {
    const input: ApoloFormData = {
      capitalInicial: 20000,
      periodoDeAplicacao: 25,
      aporte: { value: 2500, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 3.75, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: true,
        fixInflationOnAporte: true,
        aporteCrescimento: { value: false, percentage: 1 },
        impostoDeRenda: { value: false, percentage: 15 } // IR OFF
      },
    };
    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections = calculateApoloProjections(input);
    const metrics = calculateApoloMetrics(projections, input);

    // Expected RPM: 11.489,67
    expect(metrics.rendaPassivaMensal).toBeCloseTo(11489.67, 0);
  });

  it('should match RPM for Case 3 (Nominal, Growth, IR On)', () => {
    const input: ApoloFormData = {
      capitalInicial: 20000,
      periodoDeAplicacao: 25,
      aporte: { value: 2500, type: 'montly' },
      taxaDaAplicacao: { value: 10, type: 'yearly' },
      inflacao: { value: 3.75, type: 'yearly' },
      dynamic: false,
      advancedConfiguration: {
        fixInflation: false, // Nominal
        fixInflationOnAporte: false,
        aporteCrescimento: { value: true, percentage: 1 },
        impostoDeRenda: { value: true, percentage: 15 } // IR ON
      },
    };
    const { calculateApoloProjections } = require('../hooks/useApoloCalculations');
    const projections = calculateApoloProjections(input);
    const metrics = calculateApoloMetrics(projections, input);

    // Expected RPM: 12.413,36
    expect(metrics.rendaPassivaMensal).toBeCloseTo(12413.36, 0);
  });
});
