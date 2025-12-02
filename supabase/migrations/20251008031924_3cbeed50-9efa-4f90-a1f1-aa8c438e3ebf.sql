-- Adicionar novos campos à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN phone text,
ADD COLUMN area_atuacao text,
ADD COLUMN conhece_techfinance boolean DEFAULT false;

-- Criar o usuário master (apenas para desenvolvimento/teste)
-- Nota: Este é um exemplo. Em produção, você deve criar usuários através do painel do Supabase
-- ou através de um processo de signup seguro.

-- Inserir o perfil do usuário master
-- O ID do usuário deve corresponder ao ID que será criado no auth.users
-- Você precisará criar este usuário manualmente no Supabase Auth com o email: contas@emprenderdinheiro.com
-- e senha: ApoloED2025!
-- Depois, atualize este script com o ID correto ou remova esta parte e crie via interface

-- Comentário: O usuário master deve ser criado manualmente no painel do Supabase Auth
-- em Authentication > Users > Add User, com os seguintes dados:
-- Email: contas@emprenderdinheiro.com
-- Password: ApoloED2025!
-- Depois disso, o trigger handle_new_user criará automaticamente o perfil
