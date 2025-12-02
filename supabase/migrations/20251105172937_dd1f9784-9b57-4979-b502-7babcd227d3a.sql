-- Make client_id nullable to allow Apolo profiles flow
begin;

alter table public.financial_studies
  alter column client_id drop not null;

commit;