
// Target: Capital + Aportes = 1,446,373.46
// Inputs:
// Initial: 20,000
// Monthly: 2,500
// Period: 25 years (300 months)
// Inflation: 3.75% / year
// Growth: 1% / year (Real)

const target = 1446373.46;
const initial = 20000;
const monthly = 2500;
const months = 300;
const inflationYearly = 3.75;
const growthYearly = 1.0;

function calculateAccumulated(inflationType: 'compound' | 'simple', growthType: 'compound' | 'simple') {
    let accumulated = initial;
    let currentAporte = monthly;

    const inflationMonthly = inflationType === 'compound'
        ? (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100
        : inflationYearly / 12;

    const growthMonthly = growthType === 'compound'
        ? (Math.pow(1 + growthYearly / 100, 1 / 12) - 1) * 100
        : growthYearly / 12;

    for (let i = 1; i <= months; i++) {
        // Aporte update logic (from month 2)
        if (i > 1) {
            currentAporte = currentAporte * (1 + inflationMonthly / 100);
            currentAporte = currentAporte * (1 + growthMonthly / 100);
        }
        accumulated += currentAporte;
    }
    return accumulated;
}

console.log('--- Aporte Accumulation Tests ---');
console.log(`Target: ${target.toLocaleString('pt-BR')}`);

const res1 = calculateAccumulated('compound', 'compound');
console.log(`1. Compound Inflation, Compound Growth: ${res1.toLocaleString('pt-BR')} (Diff: ${(res1 - target).toFixed(2)})`);

const res2 = calculateAccumulated('compound', 'simple');
console.log(`2. Compound Inflation, Simple Growth:   ${res2.toLocaleString('pt-BR')} (Diff: ${(res2 - target).toFixed(2)})`);
// This is what we have now (1.441M)

const res3 = calculateAccumulated('simple', 'simple');
console.log(`3. Simple Inflation, Simple Growth:     ${res3.toLocaleString('pt-BR')} (Diff: ${(res3 - target).toFixed(2)})`);

const res4 = calculateAccumulated('simple', 'compound');
console.log(`4. Simple Inflation, Compound Growth:   ${res4.toLocaleString('pt-BR')} (Diff: ${(res4 - target).toFixed(2)})`);

// Hypothesis: Maybe Inflation is applied to the Aporte BEFORE adding it in the first month?
// No, usually Aporte 1 is base.

// Hypothesis: Maybe the "Inflation" rate used for Aporte is rounded?
// 3.75% -> 0.0375
// Monthly Simple: 0.003125
// Monthly Compound: 0.00307...

// Let's check if there's a "Day Count" logic?
// No, usually monthly.

// Hypothesis: Maybe the Growth is applied additively to Inflation?
// Factor = 1 + Inflation + Growth?
function calculateAdditive() {
    let accumulated = initial;
    let currentAporte = monthly;

    // Using Simple rates for additive usually
    const inflationMonthly = inflationYearly / 12;
    const growthMonthly = growthYearly / 12;

    for (let i = 1; i <= months; i++) {
        if (i > 1) {
            currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100);
        }
        accumulated += currentAporte;
    }
    return accumulated;
}
const resAdditive = calculateAdditive();
console.log(`5. Additive (Simple + Simple):          ${resAdditive.toLocaleString('pt-BR')} (Diff: ${(resAdditive - target).toFixed(2)})`);

// Hypothesis 6: Additive Mixed (Compound Inflation + Simple Growth)
// Factor = 1 + InflationCompound + GrowthSimple
function calculateAdditiveMixed() {
    let accumulated = initial;
    let currentAporte = monthly;

    const inflationMonthly = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const growthMonthly = growthYearly / 12;

    for (let i = 1; i <= months; i++) {
        if (i > 1) {
            currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100);
        }
        accumulated += currentAporte;
    }
    return accumulated;
}
const resAddMixed = calculateAdditiveMixed();
console.log(`6. Additive Mixed (Comp Inf + Simp Gr): ${resAddMixed.toLocaleString('pt-BR')} (Diff: ${(resAddMixed - target).toFixed(2)})`);

// Hypothesis 7: Beginning of Month Aporte (Accumulated includes interest on Aporte?)
// No, this script only calculates the SUM of Aportes (Nominal).
// The "Capital + Aportes" value in Apolo is usually just the Sum of Nominal Aportes.
// Unless... it includes the "Inflation Correction" on the Capital too?
// "Capital Inicial + Aportes" = Capital (Nominal? Real?) + Sum(Aportes)
// Usually "Capital Inicial" is fixed at 20k.
// But if "Corrigir patrimônio pela inflação" is on, maybe this label means "Capital Corrected + Aportes Corrected"?
// Let's check the value 1.446M.
// 20k corrected by 3.75% for 25 years:
// 20000 * (1.0375)^25 = 50,200.
// Sum Aportes (Nominal) ~ 1.441M.
// Total ~ 1.491M. Too high.
// Maybe "Capital + Aportes" means "Total Invested Nominal"?
// My 1.441M is just the Sum of Aportes + Initial Capital (20k).
// Wait, `calculateAccumulated` starts with `accumulated = initial`.
// So my 1.441M INCLUDES the 20k.

// Let's check if the target 1.446M is just "Sum of Aportes" WITHOUT Capital?
// 1.446M - 20k = 1.426M.
// 1.441M - 20k = 1.421M.
// Still a difference.

// Hypothesis 8: Inflation is Simple, but applied to the RATE?
// No.

// Hypothesis 9: Maybe the "Inflation" used for Aporte is the "IPCA Accumulado 12 meses" logic?
// No, fixed rate.

// Let's try to "Solve" for the monthly rate that gives 1.446M.
// We have a geometric series (mostly).
// Sum = Initial + Monthly * Sum((1+r)^i)
// We can binary search for the effective monthly rate.

function solveForRate() {
    let low = 0;
    let high = 1.0; // 100% per month
    let epsilon = 0.0000001;

    for (let iter = 0; iter < 100; iter++) {
        let mid = (low + high) / 2;
        let accumulated = initial;
        let currentAporte = monthly;

        for (let i = 1; i <= months; i++) {
            if (i > 1) {
                currentAporte = currentAporte * (1 + mid);
            }
            accumulated += currentAporte;
        }

        if (accumulated < target) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return low;
}

const effectiveMonthlyRate = solveForRate();
console.log(`\nEffective Monthly Rate needed: ${(effectiveMonthlyRate * 100).toFixed(6)}%`);

// Compare with known rates
const infComp = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1);
const infSimp = inflationYearly / 1200;
const groComp = (Math.pow(1 + growthYearly / 100, 1 / 12) - 1);
const groSimp = growthYearly / 1200;

console.log(`Inflation Compound: ${(infComp * 100).toFixed(6)}%`);
console.log(`Inflation Simple:   ${(infSimp * 100).toFixed(6)}%`);
console.log(`Growth Compound:    ${(groComp * 100).toFixed(6)}%`);
console.log(`Growth Simple:      ${(groSimp * 100).toFixed(6)}%`);

console.log(`Combined (InfComp * GroSimp): ${(((1 + infComp) * (1 + groSimp) - 1) * 100).toFixed(6)}%`);
console.log(`Combined (InfSimp * GroSimp): ${(((1 + infSimp) * (1 + groSimp) - 1) * 100).toFixed(6)}%`);
console.log(`Combined (Additive Mixed):    ${((infComp + groSimp) * 100).toFixed(6)}%`);

// Hypothesis 10: Correction starts from Month 1 (Input is Month 0 base)
function calculateStartFromMonth1() {
    let accumulated = initial;
    let currentAporte = monthly;

    // Use Compound Inflation and Simple Growth (Best fit so far)
    const inflationMonthly = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const growthMonthly = growthYearly / 12;

    for (let i = 1; i <= months; i++) {
        // Update BEFORE adding, even for Month 1
        currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100); // Additive or Multiplicative?
        // Let's try Multiplicative first as per my code
        // currentAporte = currentAporte * (1 + inflationMonthly/100) * (1 + growthMonthly/100);
        // Actually, let's stick to the "Mixed" logic I used in my code (Multiplicative)
        // But wait, my code used: current * (1+Inf) * (1+Gro)

        // Let's try the "Compound Inflation, Simple Growth" multiplicative
        // But applying it from Month 1
    }
    return 0; // Placeholder
}

function calculateStartFromMonth1_Multiplicative() {
    let accumulated = initial;
    let currentAporte = monthly;

    const inflationMonthly = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const growthMonthly = growthYearly / 12; // Simple Growth

    for (let i = 1; i <= months; i++) {
        // Apply correction for THIS month
        currentAporte = currentAporte * (1 + inflationMonthly / 100);
        currentAporte = currentAporte * (1 + growthMonthly / 100);

        accumulated += currentAporte;
    }
    return accumulated;
}

const resStartMonth1 = calculateStartFromMonth1_Multiplicative();
console.log(`10. Start Correction Month 1 (Mult):    ${resStartMonth1.toLocaleString('pt-BR')} (Diff: ${(resStartMonth1 - target).toFixed(2)})`);

function calculateStartFromMonth1_AdditiveMixed() {
    let accumulated = initial;
    let currentAporte = monthly;

    const inflationMonthly = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const growthMonthly = growthYearly / 12;

    for (let i = 1; i <= months; i++) {
        // Apply correction for THIS month (Additive)
        currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100);

        accumulated += currentAporte;
    }
    return accumulated;
}

const resStartMonth1Add = calculateStartFromMonth1_AdditiveMixed();
console.log(`11. Start Correction Month 1 (AddMix):  ${resStartMonth1Add.toLocaleString('pt-BR')} (Diff: ${(resStartMonth1Add - target).toFixed(2)})`);

function calculateStartFromMonth1_AdditiveCompoundGrowth() {
    let accumulated = initial;
    let currentAporte = monthly;

    const inflationMonthly = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const growthMonthly = (Math.pow(1 + growthYearly / 100, 1 / 12) - 1) * 100; // Compound Growth

    for (let i = 1; i <= months; i++) {
        // Apply correction for THIS month (Additive)
        currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100);

        accumulated += currentAporte;
    }
    return accumulated;
}

const resStartMonth1AddComp = calculateStartFromMonth1_AdditiveCompoundGrowth();
console.log(`12. Start Correction Month 1 (AddComp): ${resStartMonth1AddComp.toLocaleString('pt-BR')} (Diff: ${(resStartMonth1AddComp - target).toFixed(2)})`);

function calculateStartFromMonth1_AdditiveMixed_Rounded() {
    let accumulated = initial;
    let currentAporte = monthly;

    // Round to 4 decimal places (standard in some systems)
    // 0.307254 -> 0.3073
    const inflationMonthlyRaw = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1) * 100;
    const inflationMonthly = Math.round(inflationMonthlyRaw * 10000) / 10000;

    const growthMonthlyRaw = growthYearly / 12;
    const growthMonthly = Math.round(growthMonthlyRaw * 10000) / 10000;

    console.log(`Rounded Rates: Inf=${inflationMonthly}, Gro=${growthMonthly}`);

    for (let i = 1; i <= months; i++) {
        // Apply correction for THIS month (Additive)
        currentAporte = currentAporte * (1 + (inflationMonthly + growthMonthly) / 100);

        accumulated += currentAporte;
    }
    return accumulated;
}

const resStartMonth1AddRounded = calculateStartFromMonth1_AdditiveMixed_Rounded();
console.log(`13. Start Correction Month 1 (Rounded): ${resStartMonth1AddRounded.toLocaleString('pt-BR')} (Diff: ${(resStartMonth1AddRounded - target).toFixed(2)})`);



