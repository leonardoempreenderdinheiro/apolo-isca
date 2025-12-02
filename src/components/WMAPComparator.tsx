import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateWMAPStudy, calculateProjections, getApoloOfficialOptions, formatCurrency, type WMAPStudyInputs, type FinancialStudyData } from "@/hooks/useFinancialCalculations";
import { useState } from "react";
import { DebugComparator } from "@/components/DebugComparator";

export const WMAPComparator = () => {
  const [inputs, setInputs] = useState<WMAPStudyInputs>({
    currentAge: 35,
    targetAge: 65,
    currentPatrimony: 516632.78,
    targetPatrimony: 1899751.95,
    realReturnRate: 4.5,
    currentMonthlyInvestment: -2000,
    windowPeriod: 60
  });
  
  const [apoloOfficialResult, setApoloOfficialResult] = useState({
    finalPatrimony: 954655,
    totalContributions: 575549,
    gains: 379106
  });
  
  const [showResults, setShowResults] = useState(false);
  
  const updateInput = (field: keyof WMAPStudyInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };
  
  // Create FinancialStudyData for calculateProjections
  const financialData: FinancialStudyData = {
    currentAge: inputs.currentAge,
    applicationPeriod: inputs.targetAge - inputs.currentAge,
    initialCapital: inputs.currentPatrimony,
    contributionExpectation: Math.abs(inputs.currentMonthlyInvestment),
    contributionFrequency: "Mensal",
    returnRate: inputs.realReturnRate,
    inflation: 3.75,
    adjustCapitalInflation: true,
    adjustContributionsInflation: true,
    realGrowthContributions: 0,
    includeTax: true,
    taxRate: 15
  };
  
  // Calculate using Apolo Official mode
  const calculationOptions = getApoloOfficialOptions(financialData);
  const projections = calculateProjections(financialData, calculationOptions);
  const finalProjection = projections[projections.length - 1];
  const isRealMode = calculationOptions.inflationMode === "display_deflate_both";
  const balanceForGains = financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal;
  const lovableContributions = isRealMode ? finalProjection.real_accumulated : finalProjection.accumulated_nominal;
  const lovableGains = isRealMode ? (finalProjection.real_balance - finalProjection.real_accumulated) : (balanceForGains - finalProjection.accumulated_nominal);

  return (
    <div className="space-y-6">
      <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="text-purple-800 dark:text-purple-200">
            🔍 WMAP & Financial Calculations Comparator
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Compare os cálculos do Lovable com os resultados do Apolo Oficial
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="wmap">WMAP Results</TabsTrigger>
              <TabsTrigger value="percentages">Análise de %</TabsTrigger>
              <TabsTrigger value="projections">Monthly Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Idade Atual (C3)</Label>
                  <Input
                    type="number"
                    value={inputs.currentAge}
                    onChange={(e) => updateInput("currentAge", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Idade de Transição (C4)</Label>
                  <Input
                    type="number"
                    value={inputs.targetAge}
                    onChange={(e) => updateInput("targetAge", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Patrimônio Atual Real (C7)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputs.currentPatrimony}
                    onChange={(e) => updateInput("currentPatrimony", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Patrimonial (C8)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputs.targetPatrimony}
                    onChange={(e) => updateInput("targetPatrimony", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Taxa Real - Fase Acumulação % (C14)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputs.realReturnRate}
                    onChange={(e) => updateInput("realReturnRate", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Investimento Mensal (C17) - NEGATIVO</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputs.currentMonthlyInvestment}
                    onChange={(e) => updateInput("currentMonthlyInvestment", Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Período Padrão em Meses (C21)</Label>
                  <Input
                    type="number"
                    value={inputs.windowPeriod}
                    onChange={(e) => updateInput("windowPeriod", Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Apolo Official Results Section */}
              <div className="mt-6 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">
                  📊 Resultados do Apolo Oficial (para comparação)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Patrimônio Final (Apolo Oficial)</Label>
                    <Input
                      type="number"
                      value={apoloOfficialResult.finalPatrimony}
                      onChange={(e) => setApoloOfficialResult(prev => ({ 
                        ...prev, 
                        finalPatrimony: Number(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Total de Aportes (Apolo Oficial)</Label>
                    <Input
                      type="number"
                      value={apoloOfficialResult.totalContributions}
                      onChange={(e) => setApoloOfficialResult(prev => ({ 
                        ...prev, 
                        totalContributions: Number(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Ganhos (Apolo Oficial)</Label>
                    <Input
                      type="number"
                      value={apoloOfficialResult.gains}
                      onChange={(e) => setApoloOfficialResult(prev => ({ 
                        ...prev, 
                        gains: Number(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowResults(true)}
                className="w-full mt-4"
              >
                Calcular e Comparar
              </Button>
            </TabsContent>
            
            <TabsContent value="wmap" className="space-y-6">
              {showResults && (() => {
                const results = calculateWMAPStudy(inputs);
                
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Resultados WMAP:</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Delta Financeiro (C11)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{formatCurrency(results.delta)}</p>
                          <p className="text-xs text-muted-foreground mt-1">= C8 - C7</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Anos até Transição (C12)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{results.years} anos</p>
                          <p className="text-xs text-muted-foreground mt-1">= C4 - C3</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">A cada ano (C15)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{formatCurrency(results.yearlyContribution)}</p>
                          <p className="text-xs text-muted-foreground mt-1">= PMT(C14, C12, 0, C11)</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Eq. Mensal Simples (C16)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{formatCurrency(results.monthlyEquivalent)}</p>
                          <p className="text-xs text-muted-foreground mt-1">= C15 / 12</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Aporte Mensal Necessário (C18)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{formatCurrency(results.totalMonthlyContribution)}</p>
                          <p className="text-xs text-muted-foreground mt-1">= SUM(C16:C17)</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Quantidade de Janelas (C22)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{results.numWindows}</p>
                          <p className="text-xs text-muted-foreground mt-1">= ROUND(C12/(C21/12), 0)</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Alvo da Janela (C23)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{formatCurrency(results.windowTarget)}</p>
                          <p className="text-xs text-muted-foreground mt-1">= C11 / C22</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Windows Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Janelas de Implementação</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Janela</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Meses daqui</TableHead>
                                <TableHead>Anos faltantes</TableHead>
                                <TableHead>Valor Futuro (FV)</TableHead>
                                <TableHead>Valor Presente (PV)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.windows.map((window) => (
                                <TableRow key={window.index}>
                                  <TableCell className="font-medium">{window.index}</TableCell>
                                  <TableCell>{window.date}</TableCell>
                                  <TableCell>{window.monthsFromNow}</TableCell>
                                  <TableCell>{window.yearsFromNow}</TableCell>
                                  <TableCell>{formatCurrency(window.futureValue)}</TableCell>
                                  <TableCell className="font-bold text-primary">
                                    {formatCurrency(window.presentValue)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="mt-4 p-4 bg-muted rounded">
                          <p className="text-sm font-medium mb-2">Fórmulas das Janelas:</p>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Meses daqui (D28): Para janela 1 = C24 (meia taxa). Demais = anterior + C21</li>
                            <li>• Data (D29): = EOMONTH($C$29, meses_daqui)</li>
                            <li>• FV (D31): = ROUND(-C23, 0) (negativo!)</li>
                            <li>• Anos faltantes (D32): = YEAR($D$4) - YEAR(data_janela)</li>
                            <li>• PV (D33): = PV($C$14, anos_faltantes, 0, FV)</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </TabsContent>
            
            <TabsContent value="percentages" className="space-y-6">
              {showResults && (
                <>
                  <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-500">
                    <CardHeader>
                      <CardTitle className="text-amber-800 dark:text-amber-200">
                        📊 Análise Detalhada de Percentuais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ano</TableHead>
                              <TableHead>Patrimônio Total</TableHead>
                              <TableHead>Aportes Acum.</TableHead>
                              <TableHead>Juros Acum.</TableHead>
                              <TableHead>% Aportes</TableHead>
                              <TableHead>% Juros</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[1, 5, 10, 15, 20, 25, 30].map((year) => {
                              const monthIndex = year * 12 - 1;
                              if (monthIndex >= projections.length) return null;
                              
                              const projection = projections[monthIndex];
                              const patrimonio = isRealMode ? projection.real_balance : (financialData.includeTax ? projection.balance_after_tax_nominal : projection.balance_gross_nominal);
                              const aportes = isRealMode ? projection.real_accumulated : projection.accumulated_nominal;
                              const juros = patrimonio - aportes;
                              const percentAportes = (aportes / patrimonio) * 100;
                              const percentJuros = (juros / patrimonio) * 100;
                              
                              return (
                                <TableRow key={year}>
                                  <TableCell className="font-bold">{year} anos</TableCell>
                                  <TableCell>{formatCurrency(patrimonio)}</TableCell>
                                  <TableCell className="text-blue-600 dark:text-blue-400">
                                    {formatCurrency(aportes)}
                                  </TableCell>
                                  <TableCell className="text-green-600 dark:text-green-400">
                                    {formatCurrency(juros)}
                                  </TableCell>
                                  <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                    {percentAportes.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="font-bold text-green-600 dark:text-green-400">
                                    {percentJuros.toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500">
                    <CardHeader>
                      <CardTitle className="text-indigo-800 dark:text-indigo-200">
                        🔬 Comparação Detalhada - Ano Final
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Sistema Lovable</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Patrimônio Final</p>
                              <p className="text-lg font-bold">
                                {formatCurrency(isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal))}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Aportes</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(lovableContributions)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Juros</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(lovableGains)}
                              </p>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">% Aportes</p>
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {((lovableContributions / (isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal))) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">% Juros</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                {((lovableGains / (isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal))) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Apolo Oficial</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Patrimônio Final</p>
                              <p className="text-lg font-bold">
                                {formatCurrency(apoloOfficialResult.finalPatrimony)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Aportes</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(apoloOfficialResult.totalContributions)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Juros</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(apoloOfficialResult.gains)}
                              </p>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">% Aportes</p>
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {((apoloOfficialResult.totalContributions / apoloOfficialResult.finalPatrimony) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">% Juros</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                {((apoloOfficialResult.gains / apoloOfficialResult.finalPatrimony) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Diferença</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Δ Patrimônio</p>
                              <p className="text-lg font-bold">
                                {formatCurrency((isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal)) - apoloOfficialResult.finalPatrimony)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Δ Aportes</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(lovableContributions - apoloOfficialResult.totalContributions)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Δ Juros</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(lovableGains - apoloOfficialResult.gains)}
                              </p>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">Δ % Aportes</p>
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {(((lovableContributions / (isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal))) * 100) - ((apoloOfficialResult.totalContributions / apoloOfficialResult.finalPatrimony) * 100)).toFixed(1)}pp
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Δ % Juros</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                {(((lovableGains / (isRealMode ? finalProjection.real_balance : (financialData.includeTax ? finalProjection.balance_after_tax_nominal : finalProjection.balance_gross_nominal))) * 100) - ((apoloOfficialResult.gains / apoloOfficialResult.finalPatrimony) * 100)).toFixed(1)}pp
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500">
                        <CardHeader>
                          <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
                            🔍 Diagnóstico
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p>
                            <strong>Modo de Cálculo:</strong> {isRealMode ? "Real (deflacionado)" : "Nominal"}
                          </p>
                          <p>
                            <strong>IR Considerado:</strong> {financialData.includeTax ? `Sim (${financialData.taxRate}%)` : "Não"}
                          </p>
                          <p>
                            <strong>Inflação:</strong> {financialData.inflation}% a.a.
                          </p>
                          <p>
                            <strong>Taxa Real:</strong> {financialData.returnRate}% a.a.
                          </p>
                          <p className="pt-2 border-t text-xs text-muted-foreground">
                            As diferenças nos percentuais podem indicar variações no cálculo de aportes acumulados (se estão sendo corrigidos pela inflação ou não) ou na forma como o patrimônio real é calculado.
                          </p>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="projections" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Comparação com Apolo Oficial:</h3>
                
                {/* STEP 4: Debug Conference Block */}
                <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                  <CardHeader>
                    <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
                      🔧 Parâmetros de Cálculo (Modo Oficial)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="font-medium text-muted-foreground">Modo:</p>
                        <p className="font-bold">{isRealMode ? 'REAL' : 'NOMINAL'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Taxa informada:</p>
                        <p className="font-bold">{financialData.returnRate}% a.a. {isRealMode ? '(REAL)' : '(nominal)'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Inflação:</p>
                        <p className="font-bold">{financialData.inflation}% a.a.</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Taxa nominal p/ compor:</p>
                        <p className="font-bold text-blue-600">
                          {isRealMode 
                            ? `${(((1 + financialData.returnRate / 100) * (1 + financialData.inflation / 100) - 1) * 100).toFixed(2)}% a.a.`
                            : `${financialData.returnRate}% a.a.`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Taxa nominal mensal:</p>
                        <p className="font-bold text-blue-600">
                          {isRealMode 
                            ? `${((Math.pow(1 + (1 + financialData.returnRate / 100) * (1 + financialData.inflation / 100) - 1, 1/12) - 1) * 100).toFixed(4)}%`
                            : `${((Math.pow(1 + financialData.returnRate / 100, 1/12) - 1) * 100).toFixed(4)}%`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Depósito:</p>
                        <p className="font-bold">{calculationOptions.depositTiming === "start" ? "Início" : "Fim"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Atualização aportes:</p>
                        <p className="font-bold">{calculationOptions.contributionUpdate === "monthly" ? "Mensal" : "Anual"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Imposto:</p>
                        <p className="font-bold">{calculationOptions.taxMode === "on_redemption" ? "No resgate" : calculationOptions.taxMode === "none" ? "Sem" : "Mensal"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Taxa IR:</p>
                        <p className="font-bold">{financialData.includeTax ? `${financialData.taxRate}%` : "N/A"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Crescimento real:</p>
                        <p className="font-bold">{financialData.realGrowthContributions}% a.a.</p>
                      </div>
                    </div>
                    
                    {/* Quick Check */}
                    <div className="pt-3 border-t border-yellow-200">
                      <p className="text-xs font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Conferência Rápida:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-muted-foreground">Aportes reais esperados (sem crescimento):</p>
                          <p className="font-bold">
                            {formatCurrency(
                              financialData.initialCapital + 
                              financialData.contributionExpectation * 12 * financialData.applicationPeriod
                            )}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-muted-foreground">Último mês - Saldo bruto nominal:</p>
                          <p className="font-bold">{formatCurrency(finalProjection.balance_gross_nominal)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-muted-foreground">Último mês - Real accumulated:</p>
                          <p className="font-bold">{formatCurrency(finalProjection.real_accumulated)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-muted-foreground">Último mês - Imposto:</p>
                          <p className="font-bold">{formatCurrency(finalProjection.taxAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <p className="text-xs text-muted-foreground">Modo: {isRealMode ? 'Real' : 'Nominal'}</p>
                
                {/* Comparison Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-green-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Patrimônio Final</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Lovable:</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(finalProjection.netBalanceExhibited)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Apolo Oficial:</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(apoloOfficialResult.finalPatrimony)}
                          </p>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Diferença:</p>
                          <p className={`text-lg font-bold ${
                            Math.abs(finalProjection.netBalanceExhibited - apoloOfficialResult.finalPatrimony) < 1000 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(finalProjection.netBalanceExhibited - apoloOfficialResult.finalPatrimony)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ({((finalProjection.netBalanceExhibited / apoloOfficialResult.finalPatrimony - 1) * 100).toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Total de Aportes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Lovable:</p>
                          <p className="text-lg font-bold text-purple-600">
                            {formatCurrency(lovableContributions)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Apolo Oficial:</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(apoloOfficialResult.totalContributions)}
                          </p>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Diferença:</p>
                          <p className={`text-lg font-bold ${
                            Math.abs(lovableContributions - apoloOfficialResult.totalContributions) < 1000 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(lovableContributions - apoloOfficialResult.totalContributions)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-orange-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Ganhos com Juros</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Lovable:</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(lovableGains)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Apolo Oficial:</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(apoloOfficialResult.gains)}
                          </p>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Diferença:</p>
                          <p className={`text-lg font-bold ${
                            Math.abs(lovableGains - apoloOfficialResult.gains) < 1000 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(lovableGains - apoloOfficialResult.gains)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Monthly Projections Debug Table */}
                <DebugComparator projections={projections} maxMonths={120} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
