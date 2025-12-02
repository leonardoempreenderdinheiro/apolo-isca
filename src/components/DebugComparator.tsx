import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, type MonthlyProjection } from "@/hooks/useFinancialCalculations";

interface DebugComparatorProps {
  projections: MonthlyProjection[];
  maxMonths?: number;
}

export const DebugComparator = ({ projections, maxMonths = 36 }: DebugComparatorProps) => {
  const displayedProjections = projections.slice(0, maxMonths + 1);
  
  return (
    <Card className="mt-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
          🔧 Comparador de Debug (Dev Only)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-yellow-100 dark:bg-yellow-900">
              <tr>
                <th className="px-2 py-1 text-left border">Mês</th>
                <th className="px-2 py-1 text-right border">Aporte</th>
                <th className="px-2 py-1 text-right border">Acumulado</th>
                <th className="px-2 py-1 text-right border">Saldo Bruto</th>
                <th className="px-2 py-1 text-right border">Imposto</th>
                <th className="px-2 py-1 text-right border">Saldo Líquido</th>
                <th className="px-2 py-1 text-right border">Fator Inflação</th>
                <th className="px-2 py-1 text-right border">Real Balance</th>
                <th className="px-2 py-1 text-right border">Exibido</th>
              </tr>
            </thead>
            <tbody>
              {displayedProjections.map((proj, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-yellow-50 dark:bg-yellow-950/10'}>
                  <td className="px-2 py-1 border font-mono">{proj.month}</td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.contribution_nominal)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.accumulated_nominal)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.balance_gross_nominal)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.taxAmount)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.balance_after_tax_nominal)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono">
                    {proj.inflationFactor.toFixed(4)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px]">
                    {formatCurrency(proj.real_balance)}
                  </td>
                  <td className="px-2 py-1 text-right border font-mono text-[10px] font-bold">
                    {formatCurrency(proj.netBalanceExhibited)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
          <p><strong>Legenda:</strong></p>
          <p>• <strong>Aporte:</strong> Contribuição mensal (nominal)</p>
          <p>• <strong>Acumulado:</strong> Total de aportes acumulados (nominal)</p>
          <p>• <strong>Saldo Bruto:</strong> Saldo antes de impostos (nominal)</p>
          <p>• <strong>Saldo Líquido:</strong> Saldo após impostos (nominal)</p>
          <p>• <strong>Real Balance:</strong> Saldo deflacionado pela inflação</p>
          <p>• <strong>Exibido:</strong> Valor final mostrado nos painéis (considerando todas as opções)</p>
        </div>
      </CardContent>
    </Card>
  );
};
