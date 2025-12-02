
import { databaseGenerate } from '../lib/apoloOfficialEngine';
import { ApoloInput } from '../types/Apolo';

// Base Input (Case 2 parameters from previous turn: 30y age, 25y period, 20k initial, 2.5k monthly)
// "Idade atual: 30 anos" -> Period 25 years.
// Capital: 20000. Aporte: 2500.
// Taxa: 10%. Inflacao: 3.75%.
// Crescimento: 1%.

const baseInput: ApoloInput = {
    capitalInicial: 20000,
    periodoDeAplicacao: 25,
    aporte: { value: 2500, type: 'montly' },
    taxaDaAplicacao: { value: 10, type: 'yearly' },
    inflacao: { value: 3.75, type: 'yearly' },
    aporteCrescimento: { value: true, percentage: 1 },
    impostoDeRenda: { value: true, percentage: 15 },
    fixInflationOnAporte: true,
    fixInflation: true, // Advanced Config 1
};

function testCase(name: string, overrides: Partial<ApoloInput>, expectedRPM: number) {
    const input = { ...baseInput, ...overrides };

    // Ensure nested objects are handled if partial override didn't cover them
    if (overrides.impostoDeRenda) input.impostoDeRenda = overrides.impostoDeRenda;
    if (overrides.aporteCrescimento) input.aporteCrescimento = overrides.aporteCrescimento;

    const results = databaseGenerate(input);
    const last = results[results.length - 1];

    // Which Patrimony to use?
    // If fixInflation is TRUE, user sees "Seu patrimônio em X anos" as the REAL value (valuePresente).
    // If fixInflation is FALSE, user sees NOMINAL value (valueTotal).

    const patrimony = input.fixInflation ? last.valuePresente : last.valueTotal;

    console.log(`\n--- ${name} ---`);
    console.log(`Patrimony (${input.fixInflation ? 'Real' : 'Nominal'}): ${patrimony.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Expected RPM: ${expectedRPM.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

    const targetRate = expectedRPM / patrimony;
    console.log(`Target Monthly Rate: ${(targetRate * 100).toFixed(6)}%`);

    // Candidates
    const nom = input.taxaDaAplicacao.value;
    const inf = input.inflacao.value;
    const ir = input.impostoDeRenda.value ? input.impostoDeRenda.percentage : 0;

    // 1. Simplified Real Net: ((Nom - Inf) * (1 - IR)) / 12
    const cand1 = ((nom - inf) * (1 - ir / 100)) / 12;
    console.log(`1. Simp Real Net: ${(cand1 * 100).toFixed(6)}% (Diff: ${(cand1 - targetRate).toFixed(8)})`);

    // 2. Simplified Real Gross: (Nom - Inf) / 12
    const cand2 = (nom - inf) / 12;
    console.log(`2. Simp Real Gross: ${(cand2 * 100).toFixed(6)}% (Diff: ${(cand2 - targetRate).toFixed(8)})`);

    // 3. Simplified Nominal Net: (Nom * (1 - IR)) / 12
    const cand3 = (nom * (1 - ir / 100)) / 12;
    console.log(`3. Simp Nom Net: ${(cand3 * 100).toFixed(6)}% (Diff: ${(cand3 - targetRate).toFixed(8)})`);

    // 4. Simplified Nominal Gross: Nom / 12
    const cand4 = nom / 12;
    console.log(`4. Simp Nom Gross: ${(cand4 * 100).toFixed(6)}% (Diff: ${(cand4 - targetRate).toFixed(8)})`);

    // 5. Compound Real Net
    // RealAnnual = (1+Nom)/(1+Inf) - 1. Net = Real * (1-IR)? Or (1+NomNet)/(1+Inf)?
    // Usually: NetNominal = Nom * (1-IR). RealNet = (1+NetNom)/(1+Inf) - 1.
    const netNom = nom * (1 - ir / 100);
    const realNetAnnual = (1 + netNom / 100) / (1 + inf / 100) - 1;
    const cand5 = Math.pow(1 + realNetAnnual, 1 / 12) - 1;
    console.log(`5. Comp Real Net: ${(cand5 * 100).toFixed(6)}% (Diff: ${(cand5 - targetRate).toFixed(8)})`);

    // 6. Compound Nominal Net
    const cand6 = Math.pow(1 + netNom / 100, 1 / 12) - 1;
    console.log(`6. Comp Nom Net: ${(cand6 * 100).toFixed(6)}% (Diff: ${(cand6 - targetRate).toFixed(8)})`);

    // 7. Case 3 Special: Real Rate on Nominal Patrimony?
    // If fixInflation is OFF, Patrimony is Nominal.
    // Maybe RPM is still calculated using Real Rate?
    console.log(`7. Simp Real Net (on Current Patrimony): ${(cand1 * 100).toFixed(6)}%`);
}

// Case 1: Real, IR OFF
// fixInflation: Ligado
// fixInflationOnAporte: Ligado
// aporteCrescimento: 1% Ligado
// impostoDeRenda: 15% Desligado
testCase('Case 1', {
    fixInflation: true,
    fixInflationOnAporte: true,
    aporteCrescimento: { value: true, percentage: 1 },
    impostoDeRenda: { value: false, percentage: 15 }
}, 12857.88);

// Case 2: Real, No Growth, IR OFF
// fixInflation: Ligado
// fixInflationOnAporte: Ligado
// aporteCrescimento: Desligado
// impostoDeRenda: 15% Desligado
testCase('Case 2', {
    fixInflation: true,
    fixInflationOnAporte: true,
    aporteCrescimento: { value: false, percentage: 1 },
    impostoDeRenda: { value: false, percentage: 15 }
}, 11489.67);

// Case 3: Nominal, Growth, IR ON
// fixInflation: Desligado
// fixInflationOnAporte: Desligado
// aporteCrescimento: 1% Ligado
// impostoDeRenda: 15% Ligado
testCase('Case 3', {
    fixInflation: false,
    fixInflationOnAporte: false,
    aporteCrescimento: { value: true, percentage: 1 },
    impostoDeRenda: { value: true, percentage: 15 }
}, 12413.36);
