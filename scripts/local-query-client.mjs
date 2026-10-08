// Local rehearsal only; this adapter does not implement PostgREST.
import assert from 'node:assert/strict';

export function createLocalQueryClient(db) {
// Narrow Supabase query seam backed by real PostgreSQL/RLS, not canned rows.
const ident = value => { assert.match(value, /^[a-z_][a-z0-9_]*$/); return '"' + value + '"'; };
const client = {
  from(table) {
    const filters = [], orders = [];
    let operation = 'select', fields = '*', returning=false, payload, maxRows, offset=0, countExact=false, conflict, one = false, allowEmpty = false;
    const query = {
      select(value = '*',options={}) { fields = value; returning=true; countExact=options.count==='exact'; return this; }, insert(value) { operation = 'insert'; payload = value; return this; },
      delete() {operation='delete';return this;},
      upsert(value,options) {operation='upsert';payload=value;conflict=options.onConflict;return this;},
      update(value) { operation = 'update'; payload = value; return this; },
      eq(key, value) { filters.push([key, '=', value]); return this; }, neq(key, value) { filters.push([key, '<>', value]); return this; },
      lt(key, value) { filters.push([key, '<', value]); return this; }, gt(key, value) { filters.push([key, '>', value]); return this; },
      gte(key, value) { filters.push([key, '>=', value]); return this; }, lte(key, value) { filters.push([key, '<=', value]); return this; }, in(key, value) { filters.push([key, 'in', value]); return this; },
      is(key, value) { assert.equal(value,null); filters.push([key,'is',value]); return this; },
      order(key, options = {}) { orders.push(`${ident(key)} ${options.ascending === false ? 'desc' : 'asc'}${options.nullsFirst===false ? ' nulls last' : ''}`); return this; },
      limit(value) { assert.ok(Number.isInteger(value)); maxRows = value; return this; },
      range(start,end) {assert.ok(Number.isInteger(start) && Number.isInteger(end));offset=start;maxRows=end-start+1;return this;},
      single() { one = true; return this; }, maybeSingle() { one = true; allowEmpty = true; return this; },
      async then(resolve, reject) {
        try {
          const params = [];
          const bind = value => { params.push(value); return '$' + params.length; };
          const where = () => filters.length ? ' where ' + filters.map(([key, operator, value]) => operator === 'in'
            ? `${ident(key)} in (${value.map(bind).join(',')})` : operator==='is' ? `${ident(key)} is null` : `${ident(key)} ${operator} ${bind(value)}`).join(' and ') : '';
          let sql;
          if (operation === 'insert' || operation==='upsert') {
            const columns = Object.keys(payload).map(ident).join(',');
            const onConflict=operation==='upsert' ? ` on conflict (${conflict.split(',').map(ident).join(',')}) do update set ${Object.keys(payload).map(key=>`${ident(key)}=excluded.${ident(key)}`).join(',')}` : '';
            const insertSql=`insert into public.${ident(table)} (${columns}) select ${columns} from jsonb_populate_record(null::public.${ident(table)}, ${bind(JSON.stringify(payload))}::jsonb)${onConflict}`;
            sql = returning ? `with rows as (${insertSql} returning *) select to_jsonb(rows) row from rows` : insertSql;
          } else if (operation === 'update') {
            sql = `with rows as (update public.${ident(table)} set ${Object.entries(payload).map(([key, value]) => `${ident(key)}=${bind(value)}`).join(',')}${where()} returning *) select to_jsonb(rows) row from rows`;
          } else if (operation==='delete') {
            sql=`with rows as (delete from public.${ident(table)}${where()} returning *) select to_jsonb(rows) row from rows`;
          } else {
            sql = `select to_jsonb(rows) row from (select * from public.${ident(table)}${where()}${orders.length ? ' order by ' + orders.join(',') : ''}${maxRows ? ' limit ' + maxRows : ''}${offset ? ' offset '+offset : ''}) rows`;
          }
          const rows = (await db.query(sql, params)).rows.map(result => result.row);
          let count;
          if (countExact) {
            params.length=0;
            count=(await db.query(`select count(*)::int n from public.${ident(table)}${where()}`,params)).rows[0].n;
          }
          if (fields.includes('crm_pacientes(')) for (const row of rows) {
            row.crm_pacientes = (await db.query('select nombre,apellidos from crm_pacientes where id=$1', [row.paciente_id])).rows[0] || null;
          }
          const result = one && (rows.length > 1 || (!allowEmpty && !rows.length))
            ? { data: null, error: { code: 'PGRST116', message: 'Expected one row' } }
            : { data: one ? rows[0] || null : rows, error: null, count };
          return resolve(result);
        } catch (error) { return resolve({ data: null, error }); }
      },
    };
    return query;
  },
  async rpc(name, args) {
    const calls = {
      create_clinic_record_once: ['select public.create_clinic_record_once($1,$2,$3::jsonb) result', [args.operation_id,args.kind,JSON.stringify(args.fields)]],
      review_exercise_recommendation: ['select public.review_exercise_recommendation($1,$2,$3,$4) result', [args.target_id,args.decision,args.note,args.expected_version]],
      consume_clinic_bono: ['select public.consume_clinic_bono($1) result', [args.target_id]],
      issue_clinic_invoice: ['select public.issue_clinic_invoice($1,$2,$3,$4) result', [args.target_patient,args.payment_ids,args.tax_percent,args.invoice_notes]],
    };
    assert.ok(calls[name], 'Unexpected local RPC');
    try {
      return { data: (await db.query(...calls[name])).rows[0].result };
    } catch (error) { return { error }; }
  },
};
  return client;
}
