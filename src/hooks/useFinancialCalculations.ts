export interface MonthlyProjection {
  month: number;
  age: number;
  contribution: number;
  accumulatedContributions: number;
  balance: number;
  netBalance: number;
  year: number;
  // New detailed fields for engine
  contribution_nominal: number;
  accumulated_nominal: number;
  balance_gross_nominal: number;
  balance_after_tax_nominal: number;
  real_balance: number;
  real_accumulated: number;
  netBalanceExhibited: number;
  inflationFactor: number;
  taxAmount: number;
}

export interface FinancialStudyData {
  currentAge: number;
  applicationPeriod: number;
  initialCapital: number;
  contributionExpectation: number;
  contributionFrequency: string;
  returnRate: number;
  inflation: number;
  adjustCapitalInflation: boolean;
  adjustContributionsInflation: boolean;
  realGrowthContributions: number;
  includeTax: boolean;
  taxRate: number;
}

export interface CalculationOptions {
  rateCompounding: "effective" | "simple";
  depositTiming: "start" | "end";
  contributionUpdate: "annual" | "monthly";
  inflationMode: "none" | "display_deflate_both" | "display_nominal";
  taxMode: "none" | "on_redemption" | "monthly";
  rounding: "none" | "monthly" | "final";
  passiveIncomeRate?: number; // Custom passive income rate (default 0.5%)
}

const DEFAULT_OPTIONS: CalculationOptions = {
  rateCompounding: "effective",
  depositTiming: "start",
  contributionUpdate: "annual",
  inflationMode: "display_nominal",
  taxMode: "none",
  rounding: "none",
  passiveIncomeRate: 0.5
};

// Helper function to round based on rounding mode
const applyRounding = (value: number, roundingMode: "none" | "monthly" | "final", isFinal: boolean): number => {
  if (roundingMode === "none") {
    return value; // Sem arredondamento
  }
  if (roundingMode === "monthly" || isFinal) {
    return Math.round(value * 100) / 100;
  }
  return value;
};

export const calculateProjections = (
  data: FinancialStudyData,
  options: Partial<CalculationOptions> = {}
): MonthlyProjection[] => {
  const opts: CalculationOptions = { ...DEFAULT_OPTIONS, ...options };
  const projections: MonthlyProjection[] = [];
  
  // A. AÇÃO 1: Arredondar as taxas anuais de entrada para 2 casas decimais (replicando a UI)
  const annualInflation = Math.round(data.inflation * 100) / 100 / 100; // Ex: 3.75% -> 0.0375
  const annualReturnRate = Math.round(data.returnRate * 100) / 100 / 100; // Ex: 10.00% -> 0.10
  
  // B. AÇÃO 2: Garantir que a inflação mensal seja a taxa anual simples dividida por 12
  let monthlyInflation = annualInflation / 12;
  
  // Calculate monthly return rate
  // STEP 1 FIX: In real mode (display_deflate_both), convert real rate to nominal rate first
  let monthlyReturnRate: number;
  let effectiveAnnualRate = annualReturnRate;
  
  if (opts.inflationMode === "display_deflate_both") {
    // data.returnRate is interpreted as REAL annual rate
    // Calculate nominal annual rate: r_nominal = (1 + r_real) * (1 + inflation) - 1
    effectiveAnnualRate = (1 + annualReturnRate) * (1 + annualInflation) - 1;
  }
  
  if (opts.rateCompounding === "effective") {
    // i_m_eff = (1 + r_anual)^(1/12) - 1
    monthlyReturnRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  } else {
    // Simple: r_anual / 12
    monthlyReturnRate = effectiveAnnualRate / 12;
  }
  
  // C. AÇÃO 3: Arredondar a taxa mensal para 6 casas decimais (replicando erro de precisão do Oficial)
  monthlyReturnRate = Math.round(monthlyReturnRate * 1000000) / 1000000;
  
  // CORREÇÃO 2: Apply IR reduction to rate if includeTax is active (Apolo method)
  let effectiveMonthlyReturnRate = monthlyReturnRate;
  if (data.includeTax) {
    effectiveMonthlyReturnRate = monthlyReturnRate * (1 - data.taxRate / 100);
    // C. AÇÃO 3: Arredondar a taxa efetiva para 6 casas decimais
    effectiveMonthlyReturnRate = Math.round(effectiveMonthlyReturnRate * 1000000) / 1000000;
  }
  const monthlyContribution = data.contributionFrequency === 'Mensal' 
    ? data.contributionExpectation 
    : data.contributionExpectation / 12;
  
  // State variables
  // A. CAPITAL INICIAL: No Apolo Oficial, o capital inicial NÃO é corrigido pela inflação
  // Ele entra como está e só os aportes mensais são corrigidos
  let balance_nominal = data.initialCapital;
  let accumulated_nominal = data.initialCapital;
  let real_accumulated_running = data.initialCapital; // Track real accumulated incrementally
  let real_balance_incremental = data.initialCapital; // CORREÇÃO 3: Track real balance incrementally
  
  const totalMonths = data.applicationPeriod * 12;
  
  for (let month = 0; month <= totalMonths; month++) {
    const year = Math.floor(month / 12);
    const currentAge = data.currentAge + year;
    const isFinalMonth = month === totalMonths;
    
    // Calculate contribution for this month
    let contribution_nominal = 0;
    if (month > 0) {
      contribution_nominal = monthlyContribution;
      
      // Apply contribution adjustments based on update mode
      if (opts.contributionUpdate === "annual") {
        // Only apply adjustments at year rollover (months 12, 24, 36, etc.)
        const yearsElapsed = Math.floor(month / 12);
        
        if (data.adjustContributionsInflation && yearsElapsed > 0) {
          const annualInflationFactor = Math.pow(1 + annualInflation, yearsElapsed);
          contribution_nominal = monthlyContribution * annualInflationFactor;
        }
        
        // Apply real growth (annual)
        const sanitizedRealGrowth = data.realGrowthContributions >= 100 
          ? 0 
          : Math.max(0, data.realGrowthContributions);
        if (sanitizedRealGrowth > 0 && yearsElapsed > 0) {
          const realGrowthFactor = Math.pow(1 + sanitizedRealGrowth / 100, yearsElapsed);
          contribution_nominal = contribution_nominal * realGrowthFactor;
        }
      } else {
        // A. LÓGICA DE CORREÇÃO INCREMENTAL (Replicar bug do Apolo Oficial)
        // Monthly update mode: aplica correção INCREMENTAL como o Oficial (linha 219)
        // O Oficial tem um bug onde aplica: deposity = deposity * (1 + this.montlyInflation / 100)
        // Isso é INCREMENTAL, não retroativo composto
        if (data.adjustContributionsInflation) {
          // A. Aplicar correção incremental (mês a mês) para replicar o Oficial
          // Começamos com o valor base e aplicamos inflação mês a mês
          let correctedContribution = monthlyContribution;
          for (let i = 1; i <= month; i++) {
            correctedContribution = correctedContribution * (1 + monthlyInflation);
          }
          contribution_nominal = correctedContribution;
        }
        
        const sanitizedRealGrowth = data.realGrowthContributions >= 100 
          ? 0 
          : Math.max(0, data.realGrowthContributions);
        if (sanitizedRealGrowth > 0) {
          // A. Crescimento real também incremental
          const realGrowthMonthly = Math.pow(1 + sanitizedRealGrowth / 100, 1 / 12) - 1;
          let growthCorrectedContribution = contribution_nominal;
          for (let i = 1; i <= month; i++) {
            growthCorrectedContribution = growthCorrectedContribution * (1 + realGrowthMonthly);
          }
          contribution_nominal = growthCorrectedContribution;
        }
      }
      
      // Apply rounding
      contribution_nominal = applyRounding(contribution_nominal, opts.rounding, isFinalMonth);
    }
    
    // C. AJUSTE FINO: Cálculo dos juros sobre patrimônio nominal (Apolo Oficial)
    // Apply deposit timing and returns
    if (opts.depositTiming === "start") {
      // Add contribution first, then apply returns
      if (month > 0) {
        balance_nominal += contribution_nominal;
        accumulated_nominal += contribution_nominal;
        // C. APLICAR PRECISÃO APÓS ADIÇÃO DE APORTE
        balance_nominal = Number(balance_nominal.toPrecision(15));
        accumulated_nominal = Number(accumulated_nominal.toPrecision(15));
      }
      
      if (month > 0) {
        // C. Calcula juros sobre balance_nominal que inclui aportes corrigidos
        const interest = balance_nominal * effectiveMonthlyReturnRate;
        balance_nominal = balance_nominal + interest;
        // C. APLICAR PRECISÃO APÓS ADIÇÃO DE JUROS
        balance_nominal = Number(balance_nominal.toPrecision(15));
      }
    } else {
      // Apply returns first, then add contribution (Apolo Oficial usa "end")
      if (month > 0) {
        // C. Calcula juros sobre balance_nominal ANTES de adicionar aporte
        const interest = balance_nominal * effectiveMonthlyReturnRate;
        balance_nominal = balance_nominal + interest;
        // C. APLICAR PRECISÃO APÓS ADIÇÃO DE JUROS
        balance_nominal = Number(balance_nominal.toPrecision(15));
      }
      
      if (month > 0) {
        balance_nominal += contribution_nominal;
        accumulated_nominal += contribution_nominal;
        // C. APLICAR PRECISÃO APÓS ADIÇÃO DE APORTE
        balance_nominal = Number(balance_nominal.toPrecision(15));
        accumulated_nominal = Number(accumulated_nominal.toPrecision(15));
      }
    }
    
    // Apply rounding only at the end
    balance_nominal = applyRounding(balance_nominal, opts.rounding, isFinalMonth);
    accumulated_nominal = applyRounding(accumulated_nominal, opts.rounding, isFinalMonth);
    
    // Calculate tax
    // CORREÇÃO 2: Tax is now applied to the rate, so we don't calculate it separately
    // Keep taxAmount = 0 for display purposes, but balance_after_tax is the same as balance
    let taxAmount = 0;
    let balance_after_tax_nominal = balance_nominal;
    
    // Tax calculation disabled - IR is already applied to the effectiveMonthlyReturnRate
    // This matches Apolo's behavior where tax reduces the rate from the start
    
    balance_after_tax_nominal = applyRounding(balance_after_tax_nominal, opts.rounding, isFinalMonth);
    taxAmount = applyRounding(taxAmount, opts.rounding, isFinalMonth);
    
    // Calculate inflation factor
    const inflationFactor = month > 0 ? Math.pow(1 + monthlyInflation, month) : 1;
    
    // Update real accumulated incrementally (only in deflate mode)
    if (month > 0 && opts.inflationMode === "display_deflate_both") {
      const real_contribution = contribution_nominal / inflationFactor;
      real_accumulated_running += real_contribution;
    }
    
    // Calculate real values (deflated by inflation)
    // CORREÇÃO 3: Calculate real balance incrementally (Apolo method)
    let real_balance = balance_after_tax_nominal;
    let real_accumulated = accumulated_nominal; // Default: use nominal
    
    if (opts.inflationMode === "display_deflate_both") {
      if (month > 0) {
        // Calculate real monthly rate: (1 + r) / (1 + i) - 1
        const realMonthlyRate = ((1 + effectiveMonthlyReturnRate) / (1 + monthlyInflation)) - 1;
        
        // Add contribution (nominal), then apply real growth
        real_balance_incremental = (real_balance_incremental + contribution_nominal) * (1 + realMonthlyRate);
        real_balance = real_balance_incremental;
      }
      real_accumulated = real_accumulated_running; // Use incremental deflated sum
    }
    
    real_balance = applyRounding(real_balance, opts.rounding, isFinalMonth);
    real_accumulated = applyRounding(real_accumulated, opts.rounding, isFinalMonth);
    
    // Determine what to display based on inflation mode
    let netBalanceExhibited = balance_after_tax_nominal;
    
    if (opts.inflationMode === "display_deflate_both") {
      netBalanceExhibited = real_balance;
    } else if (opts.inflationMode === "display_nominal") {
      netBalanceExhibited = balance_after_tax_nominal;
    } else if (opts.inflationMode === "none") {
      netBalanceExhibited = balance_nominal;
    }
    
    // Legacy compatibility fields
    const displayBalance = data.adjustCapitalInflation && month > 0 
      ? balance_after_tax_nominal / inflationFactor 
      : balance_after_tax_nominal;
    
    projections.push({
      month,
      age: currentAge,
      contribution: month === 0 ? data.initialCapital : contribution_nominal,
      accumulatedContributions: accumulated_nominal,
      balance: balance_nominal,
      netBalance: displayBalance,
      year,
      // New engine fields
      contribution_nominal,
      accumulated_nominal,
      balance_gross_nominal: balance_nominal,
      balance_after_tax_nominal,
      real_balance,
      real_accumulated,
      netBalanceExhibited,
      inflationFactor,
      taxAmount
    });
  }
  
  return projections;
};

export const getApoloOfficialOptions = (data: FinancialStudyData): CalculationOptions => {
  const isRealMode = data.adjustCapitalInflation;
  return {
    rateCompounding: "effective",
    depositTiming: "end",
    // STEP 1: Use monthly contribution updates in real mode to eliminate intra-year bias
    contributionUpdate: isRealMode ? "monthly" : "annual",
    // STEP 2: In real mode (display_deflate_both), returnRate is interpreted as a REAL rate
    // For nominal rates, future enhancement: add rateIsNominal flag and convert using:
    // r_real = ((1 + r_nominal) / (1 + inflation)) - 1
    inflationMode: isRealMode ? "display_deflate_both" : "display_nominal",
    taxMode: data.includeTax ? "on_redemption" : "none",
    rounding: "none",
    passiveIncomeRate: 0.5
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// ============= WMAP Financial Formulas =============

/**
 * PMT - Calculate payment for a loan/investment
 * Excel: =PMT(rate, nper, pv, fv)
 * @param rate - Interest rate per period
 * @param nper - Number of periods
 * @param pv - Present value (usually 0 for future value calculations)
 * @param fv - Future value
 * @returns Payment amount per period
 */
export const calculatePMT = (rate: number, nper: number, pv: number, fv: number): number => {
  if (rate === 0) {
    return -(pv + fv) / nper;
  }
  
  const pvif = Math.pow(1 + rate, nper);
  return -(pv * pvif + fv) / ((pvif - 1) / rate);
};

/**
 * PV - Calculate present value
 * Excel: =PV(rate, nper, pmt, fv)
 * @param rate - Interest rate per period
 * @param nper - Number of periods
 * @param pmt - Payment per period (usually 0)
 * @param fv - Future value
 * @returns Present value
 */
export const calculatePV = (rate: number, nper: number, pmt: number, fv: number): number => {
  if (rate === 0) {
    return -(fv + pmt * nper);
  }
  
  const pvif = Math.pow(1 + rate, nper);
  return -(fv + pmt * ((pvif - 1) / rate)) / pvif;
};

/**
 * WMAP Calculation - Calculate yearly contribution needed
 * Based on: =PMT(rate, years, 0, delta)
 */
export const calculateYearlyContribution = (
  rate: number, // Taxa real (fase acumulação) - annual rate as decimal
  years: number, // Período em anos
  delta: number // Delta Financeiro (Meta - Patrimônio atual)
): number => {
  return calculatePMT(rate, years, 0, delta);
};

/**
 * WMAP Calculation - Calculate monthly equivalent (simple)
 * Based on: =YearlyValue/12
 */
export const calculateMonthlyEquivalent = (yearlyValue: number): number => {
  return yearlyValue / 12;
};

/**
 * WMAP Calculation - Calculate total monthly contribution needed
 * Based on: =SUM(monthlyEquivalent, currentMonthlyInvestment)
 */
export const calculateTotalMonthlyContribution = (
  monthlyEquivalent: number,
  currentMonthlyInvestment: number
): number => {
  return monthlyEquivalent + currentMonthlyInvestment;
};

/**
 * WMAP Calculation - Calculate target per window
 * Based on: =Delta/NumWindows
 */
export const calculateWindowTarget = (delta: number, numWindows: number): number => {
  return delta / numWindows;
};

/**
 * WMAP Calculation - Calculate Present Value for implementation windows
 * Based on: =PV(rate, yearsDiff, 0, futureValue)
 */
export const calculateWindowPV = (
  rate: number, // Taxa real (fase acumulação) - annual rate as decimal
  yearsDiff: number, // Diferença em anos até a janela
  futureValue: number // Valor futuro da janela (negativo)
): number => {
  return calculatePV(rate, yearsDiff, 0, futureValue);
};

/**
 * Complete WMAP Study Calculation
 * Replicates the Excel WMAP tab calculations
 */
export interface WMAPStudyInputs {
  currentAge: number;
  targetAge: number;
  currentPatrimony: number; // Patrimônio real atual
  targetPatrimony: number; // Meta de patrimônio
  realReturnRate: number; // Taxa real fase acumulação (%)
  currentMonthlyInvestment: number; // Investimento mensal atual
  windowPeriod: number; // Período padrão das janelas (em meses, ex: 60)
}

export interface WMAPStudyResults {
  delta: number; // Diferença financeira
  years: number; // Anos até a idade alvo
  yearlyContribution: number; // A cada ano
  monthlyEquivalent: number; // Eq. Mensal Simples
  totalMonthlyContribution: number; // Aporte mensal necessário
  numWindows: number; // Quantidade de janelas
  windowTarget: number; // Alvo da Janela
  windows: Array<{
    index: number;
    date: string;
    monthsFromNow: number;
    yearsFromNow: number;
    futureValue: number;
    presentValue: number;
  }>;
}

export const calculateWMAPStudy = (inputs: WMAPStudyInputs): WMAPStudyResults => {
  // C11: Delta Financeiro = Meta - Patrimônio Atual
  const delta = inputs.targetPatrimony - inputs.currentPatrimony;
  
  // C12: Anos até Transição = Idade Alvo - Idade Atual
  const years = inputs.targetAge - inputs.currentAge;
  const rateDecimal = inputs.realReturnRate / 100;
  
  // C15: Aporte Anual = PMT(taxa, anos, 0, delta)
  const yearlyContribution = calculateYearlyContribution(rateDecimal, years, delta);
  
  // C16: Eq. Mensal Simples = Aporte Anual / 12
  const monthlyEquivalent = calculateMonthlyEquivalent(yearlyContribution);
  
  // C18: Aporte Mensal Necessário = SUM(C16:C17)
  // C17 é o investimento atual (negativo), então: monthlyEquivalent + currentMonthlyInvestment
  // Como currentMonthlyInvestment é negativo, isso subtrai do necessário
  const totalMonthlyContribution = monthlyEquivalent + inputs.currentMonthlyInvestment;
  
  // C22: Quantidade de Janelas = ROUND(anos / (período em meses / 12), 0)
  const numWindows = Math.round(years / (inputs.windowPeriod / 12));
  
  // C23: Alvo da Janela = Delta / Num Janelas
  const windowTarget = calculateWindowTarget(delta, numWindows);
  
  // C24: Momento (Meia Taxa) = Período / 2
  const halfWindowPeriod = inputs.windowPeriod / 2;
  
  // Calculate transition date
  const now = new Date();
  const transitionDate = new Date(now);
  transitionDate.setFullYear(transitionDate.getFullYear() + years);
  const transitionYear = transitionDate.getFullYear();
  
  // Calculate each window
  const windows = [];
  
  for (let i = 1; i <= numWindows; i++) {
    // D28: Cronograma = C24 (primeira janela) ou anterior + C21 (demais)
    // Para janela 1: monthsFromNow = halfWindowPeriod
    // Para janela 2+: monthsFromNow = anterior + windowPeriod
    const monthsFromNow = i === 1 
      ? halfWindowPeriod 
      : halfWindowPeriod + (i - 1) * inputs.windowPeriod;
    
    // D29: Data de Avaliação = EOMONTH(hoje, monthsFromNow)
    const windowDate = new Date(now);
    windowDate.setMonth(windowDate.getMonth() + monthsFromNow);
    // Get last day of that month
    windowDate.setMonth(windowDate.getMonth() + 1);
    windowDate.setDate(0);
    const windowYear = windowDate.getFullYear();
    
    // D31: Alvo da Janela (negativo) = ROUND(-C23, 0)
    const futureValue = -Math.round(windowTarget);
    
    // D32: Diferença em Anos = YEAR(transição) - YEAR(janela)
    const yearsFromNow = transitionYear - windowYear;
    
    // D33: Valor Presente = PV(taxa, anos_faltantes, 0, alvo_negativo)
    const presentValue = calculateWindowPV(rateDecimal, yearsFromNow, futureValue);
    
    windows.push({
      index: i,
      date: windowDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      monthsFromNow,
      yearsFromNow,
      futureValue,
      presentValue: Math.abs(presentValue)
    });
  }
  
  return {
    delta,
    years,
    yearlyContribution: Math.abs(yearlyContribution),
    monthlyEquivalent: Math.abs(monthlyEquivalent),
    totalMonthlyContribution: Math.abs(totalMonthlyContribution),
    numWindows,
    windowTarget: Math.abs(windowTarget),
    windows
  };
};
