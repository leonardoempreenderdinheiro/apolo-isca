# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/59740855-3aaf-4ae5-98f3-184227e9953a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/59740855-3aaf-4ae5-98f3-184227e9953a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Motor de Cálculo Financeiro

Este projeto utiliza um motor de cálculo financeiro avançado e parametrizável para simular a evolução patrimonial ao longo do tempo.

### Características Principais

O motor de cálculo (`useFinancialCalculations.ts`) implementa:

#### 1. **Taxa de Retorno**
- **Effective (efetiva)**: Usa a fórmula `i_m = (1 + r_anual)^(1/12) - 1` para calcular a taxa mensal efetiva
- **Simple**: Divide a taxa anual por 12 (r_anual / 12)

#### 2. **Timing de Depósito**
- **Start**: Aplica o aporte no início do mês, antes dos juros
- **End**: Aplica o aporte no final do mês, após os juros

#### 3. **Reajuste de Aportes**
- **Annual**: Reajusta os aportes pela inflação e crescimento real apenas no rollover anual (meses 12, 24, 36...)
- **Monthly**: Reajusta mensalmente (comportamento legado)

#### 4. **Modos de Inflação**
- **display_deflate_both**: Deflaciona saldo E aportes para manter coerência nos ganhos reais
- **display_nominal**: Exibe valores nominais (sem deflação)
- **none**: Não aplica inflação

#### 5. **Impostos**
- **on_redemption**: Calcula IR apenas no resgate (não corrói o acúmulo mensal)
- **monthly**: Aplica IR mensalmente (legado, não recomendado)
- **none**: Sem impostos

#### 6. **Arredondamento**
- **monthly**: Arredonda para 2 casas decimais a cada mês
- **final**: Arredonda apenas no resultado final

### Modo Apolo Oficial

O sistema está configurado para usar automaticamente as opções do "Modo Apolo Oficial", que garante compatibilidade com os cálculos oficiais:

```typescript
{
  rateCompounding: "effective",      // Taxa efetiva mensal
  depositTiming: "start",            // Aporte no início do mês
  contributionUpdate: "annual",      // Reajuste anual de aportes
  inflationMode: "display_deflate_both",  // Inflação real (quando ativada)
  taxMode: "on_redemption",          // IR no resgate
  rounding: "monthly",               // Arredondamento mensal
  passiveIncomeRate: 0.5             // 0,5% para renda passiva
}
```

### Estrutura de Dados

Cada projeção mensal retorna:

- `contribution_nominal`: Contribuição mensal (valor nominal)
- `accumulated_nominal`: Total de aportes acumulados (nominal)
- `balance_gross_nominal`: Saldo bruto antes de impostos (nominal)
- `balance_after_tax_nominal`: Saldo após impostos (nominal)
- `real_balance`: Saldo deflacionado pela inflação
- `real_accumulated`: Aportes deflacionados pela inflação
- `netBalanceExhibited`: Valor final exibido (depende das configurações)
- `inflationFactor`: Fator acumulado de inflação
- `taxAmount`: Valor do imposto calculado

### Testes

O projeto inclui testes unitários abrangentes usando Vitest:

```bash
npm run test
```

Os testes cobrem:
1. Cenário sem inflação, sem IR, aporte fixo mensal (validação básica)
2. Cenário com inflação 3,75% e reajuste anual (validação de inflação real)
3. Cenário com IR no resgate e diferentes timings (validação de impostos)

### Fórmulas Utilizadas

**Taxa Mensal Efetiva:**
```
i_m_eff = (1 + r_anual)^(1/12) - 1
```

**Acúmulo com Juros Compostos (depositTiming="start"):**
```
Mês 0: Saldo = Capital_Inicial
Mês N: Saldo = (Saldo_Anterior + Aporte_N) × (1 + i_m)
```

**Deflação pela Inflação:**
```
Valor_Real = Valor_Nominal / [(1 + inflação_mensal)^meses]
```

**Imposto no Resgate:**
```
IR = max(0, (Saldo_Final - Aportes_Totais) × alíquota)
Saldo_Líquido = Saldo_Bruto - IR
```

### Consistência dos Cálculos

O motor garante que todos os valores exibidos (patrimônio final, ganhos, percentuais) usem a mesma "moeda":
- **Modo Real**: Todos os valores são deflacionados pela inflação
- **Modo Nominal**: Todos os valores são mantidos em valores nominais

Isso garante que a fórmula `Ganhos = Patrimônio_Final - Aportes_Totais` seja sempre consistente.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/59740855-3aaf-4ae5-98f3-184227e9953a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
