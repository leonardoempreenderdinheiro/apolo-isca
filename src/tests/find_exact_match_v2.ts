
const target = 1446373.46;
const initial = 20000;
const monthly = 2500;
const months = 300;
const inflationYearly = 3.75;
const growthYearly = 1.0;

// We need to find the effective monthly rate 'r' such that:
// Target = Initial + Sum(Monthly * (1+r)^i) ?
// Or Target = Initial + Sum(Monthly_i) where Monthly_i grows by r?
// "Capital Inicial + Aportes" usually means the SUM of all inflows.
// If inflows are corrected, it's Sum(Corrected Aportes) + Corrected Capital?
// Or just Sum(Corrected Aportes) + Nominal Capital?
// Given the magnitude (1.44M), and 2500*300 = 750k.
// It's likely Sum(Corrected Aportes) + Initial.
// Let's assume Initial is NOT corrected in this specific metric (or it is?).
// If Initial is corrected: 20k * (1+r)^300 ~ 50k.
// If Initial is NOT corrected: 20k.
// Let's assume the metric is "Total Nominal Invested" (but corrected for inflation/growth as they occur).

// Function to calculate sum given a rate and start month logic
function calculateSum(rate: number, startMonth: number, initialIsCorrected: boolean) {
    let sum = initialIsCorrected ? initial * Math.pow(1 + rate, months) : initial;
    let currentAporte = monthly;

    // If startMonth = 1, we apply rate before adding first aporte.
    // If startMonth = 0, we add first aporte then apply rate for next.

    for (let i = 1; i <= months; i++) {
        if (i >= startMonth) {
            currentAporte = currentAporte * (1 + rate);
        }
        sum += currentAporte;
    }
    return sum;
}

// Binary search for rate
function solveRate(targetVal: number, startMonth: number, initialIsCorrected: boolean) {
    let low = 0;
    let high = 0.01; // 1% per month

    for (let i = 0; i < 1000; i++) {
        let mid = (low + high) / 2;
        let val = calculateSum(mid, startMonth, initialIsCorrected);
        if (val < targetVal) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return low;
}

console.log(`Target: ${target}`);

// Scenario A: Correction starts Month 1. Initial is Fixed (20k).
const rateA = solveRate(target, 1, false);
console.log(`Scenario A (Start Month 1, Initial Fixed): Rate = ${(rateA * 100).toFixed(9)}%`);

// Scenario B: Correction starts Month 2. Initial is Fixed.
const rateB = solveRate(target, 2, false);
console.log(`Scenario B (Start Month 2, Initial Fixed): Rate = ${(rateB * 100).toFixed(6)}%`);

// Scenario C: Correction starts Month 1. Initial is Corrected.
const rateC = solveRate(target, 1, true);
console.log(`Scenario C (Start Month 1, Initial Corrected): Rate = ${(rateC * 100).toFixed(6)}%`);

// Known Components
const infComp = (Math.pow(1 + inflationYearly / 100, 1 / 12) - 1);
const infSimp = inflationYearly / 1200;
const groComp = (Math.pow(1 + growthYearly / 100, 1 / 12) - 1);
const groSimp = growthYearly / 1200;

console.log('\n--- Known Rates ---');
console.log(`Inf Compound: ${(infComp * 100).toFixed(6)}%`);
console.log(`Inf Simple:   ${(infSimp * 100).toFixed(6)}%`);
console.log(`Gro Compound: ${(groComp * 100).toFixed(6)}%`);
console.log(`Gro Simple:   ${(groSimp * 100).toFixed(6)}%`);

console.log('\n--- Combinations ---');
console.log(`Add (InfComp + GroSimp): ${((infComp + groSimp) * 100).toFixed(6)}%`);
console.log(`Add (InfComp + GroComp): ${((infComp + groComp) * 100).toFixed(6)}%`);
console.log(`Add (InfSimp + GroSimp): ${((infSimp + groSimp) * 100).toFixed(6)}%`);
console.log(`Mult (InfComp * GroSimp): ${(((1 + infComp) * (1 + groSimp) - 1) * 100).toFixed(6)}%`);

// Check matches
function checkMatch(name: string, calculatedRate: number, targetRate: number) {
    const diff = Math.abs(calculatedRate - targetRate);
    if (diff < 0.000001) {
        console.log(`MATCH FOUND: ${name}`);
    }
}

checkMatch('Scenario A vs Add(InfComp+GroSimp)', rateA, infComp + groSimp);

// Hypothesis 14: Combine Annual Rates then Convert to Monthly
// Rate = ((1+InfYear)*(1+GroYear))^(1/12) - 1
const combinedAnnual = (1 + inflationYearly / 100) * (1 + growthYearly / 100);
const monthlyFromCombined = (Math.pow(combinedAnnual, 1 / 12) - 1);
console.log(`Hypothesis 14 (Annual Mult -> Monthly): ${(monthlyFromCombined * 100).toFixed(9)}%`);
checkMatch('Scenario A vs Hyp14', rateA, monthlyFromCombined);
const decimals = [3, 4, 5, 6, 7];

for (let dInf of decimals) {
    for (let dGro of decimals) {
        const factor = Math.pow(10, dInf);
        const factorG = Math.pow(10, dGro);

        // Try rounding the MONTHLY rates
        const infR = Math.round(infComp * 100 * factor) / factor / 100;
        const groR = Math.round(groComp * 100 * factorG) / factorG / 100;

        const combined = infR + groR;
        const diff = Math.abs(combined - rateA);

        if (diff < 0.0000001) {
            console.log(`MATCH: Inf Round ${dInf}, Gro Round ${dGro} (Compound Growth)`);
        }

        // Try Simple Growth
        const groRS = Math.round(groSimp * 100 * factorG) / factorG / 100;
        const combinedS = infR + groRS;
        const diffS = Math.abs(combinedS - rateA);

        if (diffS < 0.0000001) {
            console.log(`MATCH: Inf Round ${dInf}, Gro Round ${dGro} (Simple Growth)`);
        }
    }
}

// Check specific value 0.390463%
// 0.390463% = 0.00390463
// InfComp = 0.00307254
// GroComp = 0.00082954
// Sum = 0.00390208
// Diff = 0.00000255 -> 0.000255%
// This is small.

// Maybe the "Inflation" is 3.75% but the monthly is hardcoded/rounded?
// 3.75 / 12 = 0.3125
// 0.3125 + 0.082954 = 0.395... Too high.

// Maybe "Growth" is 1% -> 0.01.
// Monthly = 0.01 / 12 = 0.0008333...
// 0.307254 + 0.083333 = 0.390587...
// Target: 0.390463...
// Diff: 0.00012...

// What if the "Start Month" logic is slightly different?
// Maybe "Month 1" correction is partial? No.

// Let's check the target value 1,446,373.46 again.
// Is it possible the user's "Real Case" has a slightly different input?
// "Idade atual: 30 anos", "Período: 25 anos".
// "Capital Inicial: 20.000".
// "Aporte: 2.500".
// "Taxa: 10%". "Inflação: 3.75%". "Crescimento: 1%".

// Maybe the "Inflation" is calculated as `(1+3.75%)^(1/12) - 1` rounded to 4 decimals?
// 0.3073%
// Growth Simple: 0.0833%
// Sum: 0.3906% (Too high)

// Maybe Growth Compound rounded?
// 0.0830%
// Sum: 0.3903% (Too low)

// 0.390463% is the target.
// 0.390463 - 0.307254 (InfComp) = 0.083209...
// What is 0.083209%?
// It's between Simple (0.0833) and Compound (0.0829).
// 0.083209 * 12 = 0.9985%...
// Is the Growth Rate 0.9985%? No, it's 1%.

// Maybe the "Inflation" is different?
// 0.390463 - 0.083333 (GroSimp) = 0.30713...
// InfComp is 0.30725...
// So we need Inflation to be slightly LOWER than Compound.
// How?
// Maybe `(1+3.75%)^(1/12)` is calculated with low precision?

// Let's try to match the EXACT value 1,446,373.46 with a "Day Count" logic?
// 365 days / 12 months? 30 days?
// 25 years = 300 months.
// Maybe some months have 31 days, some 30?
// The engine uses `moment().add(keyIndex, 'months')`.
// But the calculation loop is just `for (let keyIndex = 1...)`. It doesn't use days for interest.
// UNLESS the "Inflation" or "Growth" calculation uses days?
// `getMontlyInflation`?

