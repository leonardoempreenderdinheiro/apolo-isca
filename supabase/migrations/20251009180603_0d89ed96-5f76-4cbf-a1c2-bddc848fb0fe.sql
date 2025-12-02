-- Ensure trigger exists to populate profiles on new auth users
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing users
INSERT INTO public.profiles (id, email, full_name, phone, area_atuacao, conhece_techfinance)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'area_atuacao',
  COALESCE((u.raw_user_meta_data->>'conhece_techfinance')::boolean, false)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;