-- Adicionar colunas de pesquisa pós-cadastro à tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nivel_escolaridade TEXT,
  ADD COLUMN IF NOT EXISTS faixa_investimentos TEXT,
  ADD COLUMN IF NOT EXISTS faixa_renda_mensal TEXT;
