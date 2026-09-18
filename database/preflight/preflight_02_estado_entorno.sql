-- Preflight R-1 · Paso 2/3: estado actual del entorno respecto a la migracion.
-- Solo lectura.

select item, valor from (
  select 1 as ord, 'version_postgres' as item, version() as valor
  union all select 2, 'btree_gist_disponible', (select (count(*) > 0)::text from pg_available_extensions where name = 'btree_gist')
  union all select 3, 'btree_gist_instalada', (select (count(*) > 0)::text from pg_extension where extname = 'btree_gist')
  union all select 4, 'schema_private_existe', (select (count(*) > 0)::text from information_schema.schemata where schema_name = 'private')
  union all select 5, 'tablas_public_con_rls_activo', (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity)
  union all select 6, 'tablas_public_con_rls_forzado', (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relforcerowsecurity)
  union all select 7, 'politicas_en_crm_pacientes', (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_pacientes')
  union all select 8, 'politicas_totales_public', (select count(*)::text from pg_policies where schemaname = 'public')
  union all select 9, 'migracion_ya_aplicada_reviewed_by_profile_id', (select (count(*) > 0)::text from information_schema.columns where table_schema = 'public' and table_name = 'crm_recomendaciones' and column_name = 'reviewed_by_profile_id')
  union all select 10, 'migracion_ya_aplicada_idempotency_key', (select (count(*) > 0)::text from information_schema.columns where table_schema = 'public' and table_name = 'crm_recomendaciones' and column_name = 'idempotency_key')
  union all select 11, 'helper_public_can_access_crm_patient_presente', (select (count(*) > 0)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'can_access_crm_patient')
  union all select 12, 'helper_private_can_access_crm_patient_presente', (select (count(*) > 0)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'can_access_crm_patient')
  union all select 13, 'constraint_solape_crm_citas_presente', (select (count(*) > 0)::text from pg_constraint where conname = 'crm_citas_no_overlap')
  union all select 14, 'roles_supabase_presentes', (select (count(*) >= 3)::text from pg_roles where rolname in ('anon', 'authenticated', 'service_role'))
) s
order by ord;