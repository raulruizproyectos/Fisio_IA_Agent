-- One read-only statement: public application schema/data from one MVCC snapshot.
-- Deliberately excludes platform internals, Vault secrets and Storage binaries.
with tables as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relacl, c.relowner
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relispartition
), functions as (
  select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and not exists (
    select 1 from pg_catalog.pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e'
  )
)
select pg_catalog.jsonb_build_object(
  'project', 'uewhbaejcouenoufuwlq', 'captured_at', pg_catalog.now(),
  'version', pg_catalog.version(),
  'unsupported', (select pg_catalog.count(*) from pg_catalog.pg_attribute a join tables t on t.oid=a.attrelid
    where a.attnum>0 and not a.attisdropped and (a.attgenerated<>'' or a.attidentity<>'')),
  'tables', (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',t.relname, 'rls',t.relrowsecurity, 'force_rls',t.relforcerowsecurity,
    'columns',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid)
    ) order by a.attnum) from pg_catalog.pg_attribute a left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped),
    'rows',x.data
  ) order by t.relname) from tables t cross join lateral xmltable('/table/row' passing pg_catalog.query_to_xml(
    pg_catalog.format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text), ''[]''::jsonb)::text as data from public.%I r',t.relname),false,false,'')
    columns data text path 'data'
  ) x),
  'sequences',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',s.sequencename,'type',s.data_type::text,'start',s.start_value::text,'min',s.min_value::text,
    'max',s.max_value::text,'increment',s.increment_by::text,'cache',s.cache_size::text,'cycle',s.cycle,
    'last_value',s.last_value::text,
    'owner',(select pg_catalog.format('public.%I.%I',t.relname,a.attname) from pg_catalog.pg_depend d
      join pg_catalog.pg_class t on t.oid=d.refobjid join pg_catalog.pg_attribute a on a.attrelid=t.oid and a.attnum=d.refobjsubid
      where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='a' limit 1)
  )) from pg_catalog.pg_sequences s join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass(pg_catalog.format('public.%I',s.sequencename)) where s.schemaname='public'),
  'constraints',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',t.relname,'name',c.conname,'kind',c.contype,'definition',pg_catalog.pg_get_constraintdef(c.oid)) order by c.contype,c.conname)
    from pg_catalog.pg_constraint c join tables t on t.oid=c.conrelid),
  'indexes',(select pg_catalog.jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid)) from pg_catalog.pg_index i join tables t on t.oid=i.indrelid
    where not exists (select 1 from pg_catalog.pg_constraint c where c.conindid=i.indexrelid)),
  'functions',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('identity',pg_catalog.format('public.%I(%s)',p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)),
    'definition',pg_catalog.pg_get_functiondef(p.oid))) from functions p),
  'triggers',(select pg_catalog.jsonb_agg(pg_catalog.pg_get_triggerdef(g.oid)) from pg_catalog.pg_trigger g join tables t on t.oid=g.tgrelid where not g.tgisinternal),
  'policies',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public'),
  'table_grants',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',c.relname,'kind',c.relkind,'role',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable))
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a
    where n.nspname='public' and c.relkind in ('r','S')),
  'function_grants',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('identity',pg_catalog.format('public.%I(%s)',p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)),
    'role',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable))
    from functions p cross join lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f'::"char",p.proowner))) a),
  'column_grants',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('table',t.relname,'column',c.attname,'role',case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable))
    from tables t join pg_catalog.pg_attribute c on c.attrelid=t.oid and c.attnum>0 and not c.attisdropped cross join lateral pg_catalog.aclexplode(c.attacl) a),
  'auth_user_count',(select pg_catalog.count(*) from auth.users),
  'storage_bucket_metadata',(select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(b)),'[]'::jsonb)::text from storage.buckets b),
  'storage_object_count',(select pg_catalog.count(*) from storage.objects),
  'migration_history',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) order by m.version) from supabase_migrations.schema_migrations m)
) as snapshot;
