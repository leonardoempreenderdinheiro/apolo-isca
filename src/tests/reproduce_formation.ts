import { calculateApoloProjections, getYearlyProjections, ApoloFormData } from '../hooks/useApoloCalculations';

const runSimulation = (fixInflationOnAporte: boolean, rate: number) => {
    const initialMonthly = fixInflationOnAporte ? 3000 : 4800;

    const formData: ApoloFormData = {
        currentAge: 30,
        capitalInicial: 5000,
        periodoDeAplicacao: 25,
        aporte: { value: initialMonthly, type: 'montly' },
        taxaDaAplicacao: { value: rate, type: 'yearly' },
        inflacao: { value: 4, type: 'yearly' },
        dynamic: false,
        advancedConfiguration: {
            fixInflation: true,
            fixInflationOnAporte: fixInflationOnAporte,
            aporteCrescimento: { value: false, percentage: 0 },
            impostoDeRenda: { value: true, percentage: 15 }
        }
    };

    const projections = calculateApoloProjections(formData);
    const yearly = getYearlyProjections(projections, true);

    const last = yearly[yearly.length - 1];
    const ratio = last.aportePercent * 100;

    if (Math.abs(ratio - 60.0) < 1.0) {
        console.log(`\nMATCH FOUND (FixAporte: ${fixInflationOnAporte}, Rate: ${rate}%)`);
        console.log(`Year 25 Ratio: ${ratio.toFixed(2)}%`);
        [5, 10, 15, 20, 25].forEach(year => {
            const y = yearly.find(p => p.year === year);
            if (y) {
                console.log(`Year ${year}: Aporte ${(y.aportePercent * 100).toFixed(1)}%`);
            }
        });
    }
};

console.log("--- SEARCHING ---");
for (let r = 8; r <= 12; r += 0.1) {
    runSimulation(true, r);
    runSimulation(false, r);
}
