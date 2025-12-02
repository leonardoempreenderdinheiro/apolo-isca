begin;

alter table public.financial_studies
  add column if not exists profile_id uuid;

-- Add FK only if it doesn't exist (nulls allowed)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'financial_studies' and constraint_name = 'financial_studies_profile_id_fkey'
  ) then
    alter table public.financial_studies
      add constraint financial_studies_profile_id_fkey
      foreign key (profile_id)
      references public.apolo_profiles(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_financial_studies_profile_id on public.financial_studies(profile_id);

commit;