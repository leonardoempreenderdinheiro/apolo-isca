
import { databaseGenerate, ApoloInput, getMontlyTaxaDaAplicacao, getMontlyInflation } from '../lib/apoloOfficialEngine';

// User's Input Case 2
const input: ApoloInput = {
    capitalInicial: 20000,
    periodoDeAplicacao: 25,
    aporte: { value: 2500, type: 'montly' },
    inflacao: { value: 3.75, type: 'yearly' },
    taxaDaAplicacao: { value: 10, type: 'yearly' },
    impostoDeRenda: { value: true, percentage: 15 },
    fixInflationOnAporte: true,
    fixInflation: true,
    aporteCrescimento: { value: true, percentage: 1 },
};

// Calculate
const results = databaseGenerate(input);
const lastResult = results[results.length - 1];

console.log('--- RESULTS CASE 2 ---');
console.log('Patrimônio Total (Nominal):', lastResult.valueTotal);
console.log('Patrimônio Presente (Real):', lastResult.valuePresente);
console.log('Aportes Acumulados (Nominal):', lastResult.acumulado);
console.log('Juros Acumulados (Nominal):', lastResult.jurosAcumulados);

console.log('\n--- COMPARISON ---');
console.log('User Expected (Real Case):');
console.log('Patrimônio: R$ 2.409.309,28');
console.log('Capital+Aportes: R$ 1.446.373,46');
console.log('Juros: R$ 962.935,82');
console.log('RPM: R$ 10.666,21');

console.log('\nActual (Current Engine):');
console.log(`Patrimônio: R$ ${lastResult.valuePresente.toFixed(2)}`);
console.log(`Capital+Aportes: R$ ${lastResult.acumulado.toFixed(2)}`); // Note: This is Nominal Aportes. User "Capital+Aportes" might be Nominal too.
// Wait, in Case 1, User "Capital+Aportes" (407k) matched our Nominal Aportes (406k).
// Here: 1.446M vs 1.440M. Close.

// RPM Calculation Test
const nominalRateAnnual = input.taxaDaAplicacao.value;
const inflationRateAnnual = input.inflacao.value;
const irPercentage = input.impostoDeRenda.percentage;

// Hypothesis: Simple Interest Approximation
// ((Nominal - Inflation) * (1 - IR)) / 12
const rpmRateSimple = ((nominalRateAnnual - inflationRateAnnual) / 100 * (1 - irPercentage / 100)) / 12;
const rpmSimple = lastResult.valuePresente * rpmRateSimple;

console.log('\n--- RPM HYPOTHESIS ---');
console.log(`Rate (Simple Approx): ${(rpmRateSimple * 100).toFixed(6)}%`);
console.log(`Calculated RPM (Simple): R$ ${rpmSimple.toFixed(2)}`);
console.log(`Target RPM: R$ 10.666,21`);

// Check if Patrimony discrepancy is due to Aporte Growth formula
// Current: ((1 + 1%)^(1/12) - 1)
// Alternative: 1% / 12
const growthCompound = (Math.pow(1 + 1 / 100, 1 / 12) - 1) * 100;
const growthSimple = 1 / 12;
console.log(`\nGrowth Monthly (Compound): ${growthCompound.toFixed(6)}%`);
console.log(`Growth Monthly (Simple): ${growthSimple.toFixed(6)}%`);

// Hypothesis 2: Inflation also uses Simple Interest?
// Current Inflation (Compound): 3.75% -> 0.307%
// Simple Inflation: 3.75% / 12 = 0.3125%
// If Inflation is higher, Aportes grow faster (if fixInflationOnAporte is true).

const inflationSimple = input.inflacao.value / 12;
console.log(`Inflation Monthly (Simple): ${inflationSimple.toFixed(6)}%`);

// Let's try to simulate the loop with Simple Inflation
let simAporte = input.aporte.value;
let simPatrimony = input.capitalInicial;
let simTotalAportado = input.capitalInicial;

const monthlyTaxa = (Math.pow(1 + input.taxaDaAplicacao.value / 100, 1 / 12) - 1) * 100;
// Use Compound Taxa for this simulation
const monthlyTaxaUsed = monthlyTaxa;

console.log(`Taxa Monthly (Compound): ${monthlyTaxaUsed.toFixed(6)}%`);

// Simulation with Compound Taxa, Simple Inflation
let simPatrimonyMixed = input.capitalInicial;
let simAporteMixed = input.aporte.value;
let simTotalAportadoMixed = input.capitalInicial;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    // Update Aporte (starts updating from month 2)
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            simAporteMixed *= (1 + inflationSimple / 100);
        }
        if (input.aporteCrescimento.value) {
            simAporteMixed *= (1 + growthSimple / 100);
        }
    }

    // Interest
    const juros = simPatrimonyMixed * (monthlyTaxaUsed / 100);

    // Accumulate
    simPatrimonyMixed += juros + simAporteMixed;
    simTotalAportadoMixed += simAporteMixed;
}

// Real Adjustment (Fisher? Or Simple?)
// If User uses Simple RPM formula, maybe they use Simple Real Adjustment too?
// Real = Nominal / (1 + Inflation)^Years? Or Monthly adjustment?
// The engine does monthly adjustment.
// Let's just check the Nominal result first. User's Nominal is not explicitly given, but we can infer.
// Actually, User gave "Patrimônio em 20 anos" (Real).

// Let's assume the User's "Patrimônio" IS the Nominal value?
// No, "Corrigir patrimônio pela inflação: Ligado". So it's Real.

// If we use Simple Interest for Taxa too, the Nominal Patrimony will be different.
console.log(`Simulated Nominal Patrimony (Compound Taxa, Simple Inflation): ${simPatrimonyMixed.toFixed(2)}`);

// Real Value Calculation (Engine Style: Monthly Fisher)
// But using Simple Inflation for the Fisher equation too?
// Fisher: (1+Taxa)/(1+Inflation) - 1
const realRateMixed = ((1 + monthlyTaxaUsed / 100) / (1 + inflationSimple / 100) - 1);

let simPatrimonyRealMixed = input.capitalInicial;
let simAporteRealMixed = input.aporte.value; // Initial Aporte is Real base?
// Actually, Engine calculates Real separately.

let simRealAccumulated = input.capitalInicial;
let simRealAporteCurrent = input.aporte.value; // Does Real Aporte grow?
// In Engine:
// deposity = Nominal Aporte
// lastValuePresente = (lastValuePresente + deposity) * (1 + realRate)

let simValuePresente = input.capitalInicial;
let simNominalAporteForReal = input.aporte.value;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            simNominalAporteForReal *= (1 + inflationSimple / 100);
        }
        if (input.aporteCrescimento.value) {
            simNominalAporteForReal *= (1 + growthSimple / 100);
        }
    }

    // Engine Logic for Real:
    // valuePresente = (lastValuePresente + deposity) * (1 + taxaReal);
    simValuePresente = (simValuePresente + simNominalAporteForReal) * (1 + realRateMixed);
}

console.log(`Simulated Real Patrimony (Engine Logic, Simple Inflation): ${simValuePresente.toFixed(2)}`);

// Hypothesis 3: Aporte at Beginning of Month
// Current Engine: End of Month (Interest on Balance, then add Aporte)
// Beginning: Interest on (Balance + Aporte)

let simPatrimonyBeginning = input.capitalInicial;
let simAporteBeginning = input.aporte.value;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            simAporteBeginning *= (1 + input.inflacao.value / 100 / 12); // Use Compound or Simple? Let's stick to Compound for Inflation as per Engine default
            // Actually, let's use the Engine's default Inflation (Compound)
            simAporteBeginning = simAporteBeginning / (1 + input.inflacao.value / 100 / 12) * (Math.pow(1 + input.inflacao.value / 100, 1 / 12));
            // Wait, let's just use the calculated monthlyInflation from Engine
            simAporteBeginning = input.aporte.value; // Reset and do properly
        }
    }
}

// Let's just use the loop properly
let simPatrimonyBeg = input.capitalInicial;
let simAporteBeg = input.aporte.value;
const inflationMonthlyCompound = (Math.pow(1 + input.inflacao.value / 100, 1 / 12) - 1) * 100;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    // Update Aporte
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            simAporteBeg *= (1 + inflationMonthlyCompound / 100);
        }
        if (input.aporteCrescimento.value) {
            simAporteBeg *= (1 + growthSimple / 100); // We kept Simple Growth
        }
    }

    // Interest on (Balance + Aporte)
    const juros = (simPatrimonyBeg + simAporteBeg) * (monthlyTaxaUsed / 100);

    // Accumulate
    simPatrimonyBeg += simAporteBeg + juros;
}

console.log(`Simulated Nominal Patrimony (Beginning of Month Aporte): ${simPatrimonyBeg.toFixed(2)}`);

// Real Value for Beginning of Month
// Real = Nominal / Deflator? Or Monthly?
// If we use Monthly Fisher...
const realRateCompound = ((1 + monthlyTaxaUsed / 100) / (1 + inflationMonthlyCompound / 100) - 1);
let simRealBeg = input.capitalInicial;
let simNominalAporteBegForReal = input.aporte.value;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            simNominalAporteBegForReal *= (1 + inflationMonthlyCompound / 100);
        }
        if (input.aporteCrescimento.value) {
            simNominalAporteBegForReal *= (1 + growthSimple / 100);
        }
    }

    // Real Calculation with Beginning of Month Logic
    // valuePresente = (lastValuePresente + deposity) * (1 + realRate);
    simRealBeg = (simRealBeg + simNominalAporteBegForReal) * (1 + realRateCompound);
}

console.log(`Simulated Real Patrimony (Beginning of Month): ${simRealBeg.toFixed(2)}`);

// Hypothesis 4: Simple Inflation on Aporte ONLY
// Taxa: Compound
// Deflator: Compound
// Aporte Inflation: Simple

let simPatrimonyHyp4 = input.capitalInicial;
let simNominalAporteHyp4 = input.aporte.value;
let simRealAccumulatedHyp4 = input.capitalInicial;

// Use Compound Taxa and Compound Real Rate (Fisher)
const realRateCompoundHyp4 = ((1 + monthlyTaxaUsed / 100) / (1 + inflationMonthlyCompound / 100) - 1);

let simValuePresenteHyp4 = input.capitalInicial;
let simNominalAporteForRealHyp4 = input.aporte.value;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            // Use Simple Inflation here
            simNominalAporteForRealHyp4 *= (1 + inflationSimple / 100);
        }
        if (input.aporteCrescimento.value) {
            // Use Simple Growth here (already established)
            simNominalAporteForRealHyp4 *= (1 + growthSimple / 100);
        }
    }

    // Engine Logic for Real:
    // valuePresente = (lastValuePresente + deposity) * (1 + realRate);
    simValuePresenteHyp4 = (simValuePresenteHyp4 + simNominalAporteForRealHyp4) * (1 + realRateCompoundHyp4);
}

console.log(`Simulated Real Patrimony (Simple Inflation on Aporte Only): ${simValuePresenteHyp4.toFixed(2)}`);

// Hypothesis 5: Real Patrimony = Compounding the Simplified Real Rate
// Rate = ((Nominal - Inflation) * (1 - IR)) / 12
// This matches the RPM formula. Maybe they use this for the whole projection?

const simpleRealRateMonthly = ((input.taxaDaAplicacao.value - input.inflacao.value) / 100 * (1 - input.impostoDeRenda.percentage / 100)) / 12;
console.log(`Simplified Real Rate Monthly: ${(simpleRealRateMonthly * 100).toFixed(6)}%`);

let simPatrimonyHyp5 = input.capitalInicial;
let simNominalAporteHyp5 = input.aporte.value;

for (let i = 1; i <= input.periodoDeAplicacao * 12; i++) {
    if (i > 1) {
        if (input.fixInflationOnAporte) {
            // Inflation on Aporte: Compound or Simple?
            // If they use Simple Real Rate, maybe Simple Inflation too?
            // Let's try Simple Inflation first (since we saw it in Growth)
            simNominalAporteHyp5 *= (1 + inflationSimple / 100);
        }
        if (input.aporteCrescimento.value) {
            simNominalAporteHyp5 *= (1 + growthSimple / 100);
        }
    }

    // Compounding with Simple Real Rate
    // value = (last + aporte) * (1 + rate) ? or last * (1+rate) + aporte?
    // Usually End of Month:
    const juros = simPatrimonyHyp5 * simpleRealRateMonthly;
    simPatrimonyHyp5 += juros + simNominalAporteHyp5;
}

console.log(`Simulated Real Patrimony (Compounding Simplified Real Rate): ${simPatrimonyHyp5.toFixed(2)}`);

