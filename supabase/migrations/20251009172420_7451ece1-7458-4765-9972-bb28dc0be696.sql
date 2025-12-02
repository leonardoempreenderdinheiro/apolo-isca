-- Alterar a constraint de foreign key da tabela clients para permitir cascade
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_consultant_id_fkey;

ALTER TABLE clients 
ADD CONSTRAINT clients_consultant_id_fkey 
FOREIGN KEY (consultant_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;