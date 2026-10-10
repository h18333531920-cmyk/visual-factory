-- Additive rollout: restrict only NEW accounts created with vf_managed_account.
-- Existing shared accounts and in-use production sessions are not changed.
-- Managed accounts access material data through the authenticated account-data
-- endpoint; its service credential never leaves the server.
BEGIN;
CREATE OR REPLACE FUNCTION public.vf_is_managed_account()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT u.raw_app_meta_data ->> 'vf_managed_account' = 'true'
    FROM auth.users u WHERE u.id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.vf_is_managed_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vf_is_managed_account() TO authenticated;

DO $$
DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['vf_profiles','vf_projects','vf_categories','vf_library_options','vf_source_files','vf_asset_previews','vf_asset_favorites','vf_asset_events','vf_assets'] LOOP
    IF to_regclass('public.' || tab) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS vf_managed_accounts_use_gateway ON public.%I', tab);
      EXECUTE format('CREATE POLICY vf_managed_accounts_use_gateway ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.vf_is_managed_account()) WITH CHECK (NOT public.vf_is_managed_account())', tab);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS vf_managed_material_storage ON storage.objects;
CREATE POLICY vf_managed_material_storage ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated
USING (bucket_id NOT IN ('vf-library','vf-projects') OR NOT public.vf_is_managed_account())
WITH CHECK (bucket_id NOT IN ('vf-library','vf-projects') OR NOT public.vf_is_managed_account());
COMMIT;

-- Read-only verification: no credentials or user metadata values are selected.
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE policyname IN ('vf_managed_accounts_use_gateway','vf_managed_material_storage')
ORDER BY schemaname, tablename;
