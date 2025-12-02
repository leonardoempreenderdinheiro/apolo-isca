
import { databaseGenerate, ApoloInput, MontlyResult } from '../lib/apoloOfficialEngine';

// User's Input
const input: ApoloInput = {
    capitalInicial: 10000,
    periodoDeAplicacao: 20,
    aporte: { value: 1000, type: 'montly' },
    inflacao: { value: 3.75, type: 'yearly' },
    taxaDaAplicacao: { value: 10, type: 'yearly' },
    impostoDeRenda: { value: true, percentage: 15 },
    fixInflationOnAporte: true,
    fixInflation: true, // This is the setting in question
    aporteCrescimento: { value: true, percentage: 1 },
};

// Calculate
const results = databaseGenerate(input);
const lastResult = results[results.length - 1];

console.log('--- RESULTS ---');
console.log('Patrimônio Total (Nominal):', lastResult.valueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
console.log('Patrimônio Presente (Real):', lastResult.valuePresente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
console.log('Aportes Acumulados (Nominal):', lastResult.acumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
console.log('Juros Acumulados (Nominal):', lastResult.jurosAcumulados.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

// Check if we can derive the "Real" breakdown
// Note: The engine doesn't explicitly track Real Aportes vs Real Juros.
// But we can see if the User's "Actual" values match these.

console.log('\n--- COMPARISON ---');
console.log('User Expected (Real Case): R$ 622.867,46');
console.log('User Actual (Current):     R$ 412.327,31');

if (Math.abs(lastResult.valueTotal - 622867.46) < 1000) {
    console.log('MATCH: User Expected matches Nominal Value!');
} else {
    console.log('MISMATCH: User Expected does NOT match Nominal Value.');
}

if (Math.abs(lastResult.valuePresente - 412327.31) < 1000) {
    console.log('MATCH: User Actual matches Real Value!');
} else {
    console.log('MISMATCH: User Actual does NOT match Real Value.');
}
