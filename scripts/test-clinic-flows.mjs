// Handler/SQL integration on the restored copy. No HTTP server, Auth platform or live services.
import assert from 'node:assert/strict';
import { createLocalQueryClient } from './local-query-client.mjs';

export async function testClinicFlows(db, cfg) {
  process.env.SUPABASE_URL = 'https://example.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-fixture';
  for (const key of Object.keys(process.env)) if (/^(GOOGLE_|W5_|W6_|N8N_|TELEGRAM_|OPENWA_|OPENAI_)/.test(key)) delete process.env[key];
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network blocked in local clinic flow checks'); };
  try {
    const [{ default: agenda, createCrmAppointment }, { default: payments }, { default: exercises }, { runWithRequestContext }, { default: bonos }, { default: invoices }, {default:patients}, {default:notes}] = await Promise.all([
      import('../backend/src/routes/professional.js'), import('../backend/src/routes/payments.js'),
      import('../backend/src/routes/exercises.js'), import('../backend/src/lib/supabase.js'),
      import('../backend/src/routes/bonos.js'), import('../backend/src/routes/invoices.js'),
      import('../backend/src/routes/patients.js'), import('../backend/src/routes/clinical-notes.js'),
    ]);
    const client = createLocalQueryClient(db);
    const auth = { profile_id: cfg.profile_id, role: 'admin', clinica_id: cfg.clinic_id, clinic_id:cfg.clinic_id };
    async function invoke(router, method, path, body, params = {}, query = {}) {
      const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, send() {return this;} };
      await runWithRequestContext({ supabase: client, auth }, () => handler({ body, params, query, auth }, res,
        error => { res.statusCode = error.status || 500; res.body = { error: error.message, code: error.code }; }));
      return res;
    }
    await db.exec('reset role');
    const patientId = (await db.query("insert into crm_pacientes(nombre,created_by_profile_id,clinica_id) values('Local flow fixture',$1,$2) returning id", [cfg.profile_id, cfg.clinic_id])).rows[0].id;
    const exerciseId = (await db.query("select id from crm_ejercicios_catalogo where activo limit 1")).rows[0]?.id;
    assert.ok(exerciseId, 'The restored catalog needs an active exercise');
    const planId = (await db.query("insert into crm_recomendaciones(paciente_id,fisioterapeuta_id,estado,red_flags_present,red_flags_items,report_snapshot) values($1,$2,'requiere_revision',true,'[\"Local test alert\"]',$3) returning id", [patientId, cfg.profile_id,
      JSON.stringify({ exercises: [{ exercise_id: exerciseId, nombre: 'Local test exercise', series: 2, repeticiones: 8 }], message_to_patient: 'Local technical fixture' })])).rows[0].id;
    await db.query('insert into crm_recomendacion_items(recomendacion_id,ejercicio_id,confidence,orden) values($1,$2,0.8,1)', [planId, exerciseId]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [cfg.auth_user_id]);
    await db.exec('set role authenticated');

    const body = { paciente_id: patientId, inicio_en: '2040-01-09T09:00:00Z', fin_en: '2040-01-09T10:00:00Z', estado: 'confirmada' };
    const created = await invoke(agenda, 'post', '/appointments', body);
    assert.equal(created.statusCode, 201, created.body?.error);
    assert.equal(created.body.data.fisioterapeuta_id, cfg.profile_id);
    assert.equal((await invoke(agenda, 'post', '/appointments', body)).statusCode, 409);
    assert.equal((await invoke(agenda, 'post', '/appointments', { ...body, fin_en: body.inicio_en })).statusCode, 400);
    assert.equal((await invoke(agenda, 'patch', '/appointments/:appointmentId', { estado: 'cancelada' }, { appointmentId: created.body.data.id })).statusCode, 200);
    assert.equal((await invoke(agenda, 'post', '/appointments', body)).statusCode, 201, 'Cancellation frees the slot');
    const race = await Promise.allSettled([1, 2].map(() => runWithRequestContext({ supabase: client, auth }, () => createCrmAppointment({
      patientId, professionalId: cfg.profile_id, startAt: '2040-01-09T11:00:00Z', endAt: '2040-01-09T12:00:00Z', status: 'confirmada',
    }))));
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(race.find(result => result.status === 'rejected').reason.status, 409);
    assert.equal((await db.query("select count(*)::int n from crm_citas where paciente_id=$1 and inicio_en='2040-01-09T11:00:00Z'", [patientId])).rows[0].n, 1);
    console.log('PASS: real handlers create/cancel bookings, reject overlaps/invalid dates and retain only one concurrent reservation.');

    const payment = await invoke(payments, 'post', '/', { paciente_id: patientId, fecha: '2040-01-09', importe: '50.05', metodo_pago: 'tarjeta' });
    assert.equal(payment.statusCode, 201, payment.body?.error);
    assert.equal(Number(payment.body.data.importe), 50.05);
    assert.equal((await invoke(payments, 'patch', '/:id', { importe: '60.10' }, { id: payment.body.data.id })).statusCode, 200);
    const listed = await invoke(payments, 'get', '/', {}, {}, { paciente_id: patientId });
    assert.equal(listed.body.data.length, 1);
    assert.equal(Number(listed.body.data[0].importe), 60.1);
    assert.equal((await invoke(payments, 'patch', '/:id', { importe: -1 }, { id: payment.body.data.id })).statusCode, 400);
    assert.equal((await db.query('select importe::text value from crm_pagos where id=$1', [payment.body.data.id])).rows[0].value, '60.10');
    console.log('PASS: payment create/edit/read persists exact cents in the restored schema and rejects invalid corrections.');

    const bonus = await invoke(bonos,'post','/',{paciente_id:patientId,sesiones_total:1,precio:55,fecha_inicio:'2020-01-01'});
    assert.equal(bonus.statusCode,201,bonus.body?.error);
    const consumed=await Promise.all([1,2].map(()=>invoke(bonos,'post','/:id/usar',{}, {id:bonus.body.data.id})));
    assert.deepEqual(consumed.map(result=>result.statusCode).sort(),[200,409]);
    assert.equal((await db.query('select sesiones_usadas from crm_bonos where id=$1',[bonus.body.data.id])).rows[0].sesiones_usadas,1);
    const expired = await invoke(bonos,'post','/',{paciente_id:patientId,sesiones_total:2,precio:100,fecha_inicio:'2020-01-01',fecha_caducidad:'2020-02-01'});
    assert.equal((await invoke(bonos,'post','/:id/usar',{}, {id:expired.body.data.id})).statusCode,409);
    const multi=await invoke(bonos,'post','/',{paciente_id:patientId,sesiones_total:2,precio:100,fecha_inicio:'2020-01-01'});
    assert.deepEqual((await Promise.all([1,2].map(()=>invoke(bonos,'post','/:id/usar',{}, {id:multi.body.data.id})))).map(result=>result.statusCode),[200,200]);
    assert.equal((await db.query('select sesiones_usadas from crm_bonos where id=$1',[multi.body.data.id])).rows[0].sesiones_usadas,2);
    console.log('PASS: concurrent bono consumption never exceeds capacity or loses decrements; expired bonos cannot be consumed.');

    const issue = body => invoke(invoices,'post','/',{paciente_id:patientId,...body});
    const duplicate=await Promise.all([1,2].map(()=>issue({pago_ids:[payment.body.data.id]})));
    assert.deepEqual(duplicate.map(result=>result.statusCode).sort(),[201,409]);
    const issued=duplicate.find(result=>result.statusCode===201).body.data;
    assert.equal(Number(issued.importe_total),60.1);
    assert.equal(Number(issued.importe_iva),0);
    assert.match(issued.exencion_iva,/20.Uno.3/);
    assert.equal((await invoke(payments,'patch','/:id',{importe:1},{id:payment.body.data.id})).statusCode,409);
    assert.equal((await client.from('crm_pagos').update({factura_id:null}).eq('id',payment.body.data.id)).error.code,'42501');
    assert.equal((await invoke(payments,'get','/',{},{},{paciente_id:patientId,pendientes_factura:'true'})).body.data.length,0);
    const taxed=await invoke(payments,'post','/',{paciente_id:patientId,importe:121,metodo_pago:'tarjeta'});
    const invoiceTaxed=await issue({pago_ids:[taxed.body.data.id],iva_pct:21});
    assert.equal(invoiceTaxed.statusCode,201,invoiceTaxed.body?.error);
    assert.equal(Number(invoiceTaxed.body.data.importe_bruto),100);
    assert.equal(Number(invoiceTaxed.body.data.importe_iva),21);
    assert.equal(Number(invoiceTaxed.body.data.importe_total),121);
    assert.notEqual(invoiceTaxed.body.data.numero,issued.numero);
    await db.exec('reset role');
    await db.exec(`create function public.fail_local_invoice_audit() returns trigger language plpgsql as $$ begin
      if new.action='issue_invoice' then raise exception 'Local audit failure'; end if; return new; end $$;
      create trigger fail_local_invoice_audit before insert on crm_audit_log for each row execute function fail_local_invoice_audit()`);
    await db.exec('set role authenticated');
    const rollbackPayment=await invoke(payments,'post','/',{paciente_id:patientId,importe:25,metodo_pago:'efectivo'});
    assert.equal((await issue({pago_ids:[rollbackPayment.body.data.id]})).statusCode,500);
    assert.equal((await db.query('select factura_id from crm_pagos where id=$1',[rollbackPayment.body.data.id])).rows[0].factura_id,null);
    await db.exec('reset role; drop trigger fail_local_invoice_audit on crm_audit_log; drop function fail_local_invoice_audit(); set role authenticated');
    assert.equal((await issue({pago_ids:[rollbackPayment.body.data.id]})).statusCode,201);
    console.log('PASS: invoice issuance links each payment once, uses final charged totals, allocates distinct numbers and rolls back on audit failure.');

    await assert.rejects(db.query('delete from crm_pagos where id=$1',[payment.body.data.id]),{code:'PT409'});
    await assert.rejects(db.query('update crm_facturas set notas=$1 where id=$2',['Changed',issued.id]),{code:'42501'});
    await assert.rejects(db.query('delete from crm_facturas where id=$1',[issued.id]),{code:'42501'});
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-4000-8000-000000000099']);
    assert.equal((await issue({pago_ids:[payment.body.data.id]})).statusCode,403);
    assert.equal((await invoke(bonos,'post','/:id/usar',{}, {id:bonus.body.data.id})).statusCode,404);
    for(const role of ['anon','service_role']) {
      await db.exec('reset role; set role '+role);
      await assert.rejects(db.query('select public.issue_clinic_invoice($1)',[patientId]),{code:'42501'});
      await assert.rejects(db.query('select public.consume_clinic_bono($1)',[bonus.body.data.id]),{code:'42501'});
    }
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[cfg.auth_user_id]);
    await db.exec('set role authenticated');
    console.log('PASS: issued financial records resist client edits/deletion; unlinked sessions, anonymous and server roles cannot issue invoices or consume bonos.');

    const review = payload => invoke(exercises, 'post', '/recommendations/:recommendationId/review', payload, { recommendationId: planId });
    assert.equal((await review({ decision: 'approve', report_version: 1, note: 'Local technical check, no clinical validity' })).statusCode, 409);
    assert.equal((await review({ decision: 'approve', report_version: 0, note: 'Short' })).statusCode, 400);
    assert.equal((await db.query('select estado from crm_recomendaciones where id=$1', [planId])).rows[0].estado, 'requiere_revision');
    const approved = await review({ decision: 'approve', report_version: 0, note: 'Local technical check, no clinical validity' });
    assert.equal(approved.statusCode, 200, approved.body?.error);
    assert.equal(approved.body.data.reviewed_by_profile_id, cfg.profile_id);
    assert.equal((await review({ decision: 'approve', report_version: 0 })).statusCode, 409);
    const direct = await client.from('crm_recomendaciones').update({ report_snapshot: {} }).eq('id', planId);
    assert.equal(direct.error.code, 'PT409');
    await db.exec('reset role');
    assert.equal((await db.query("select count(*)::int n from crm_audit_log where entity_id=$1 and action='approve_recommendation'", [planId])).rows[0].n, 1);
    console.log('PASS: real review handler enforces version/alert note, derives reviewer, audits approval and blocks duplicate review/content edits.');

    await db.exec('set role authenticated');
    const newPatient=await invoke(patients,'post','/',{nombre_completo:'Local records fixture',fecha_nacimiento:'1990-01-01'});
    assert.equal(newPatient.statusCode,201,newPatient.body?.error);
    const recordPatientId=newPatient.body.data.id;
    assert.equal((await invoke(patients,'patch','/:id',{nombre:'Updated fixture'}, {id:recordPatientId})).statusCode,200);
    const note=await invoke(notes,'post','/',{paciente_id:recordPatientId,nota:'Latest fixture note',dolor_eva:0,fecha:'2040-01-09',profesional_id:cfg.auth_user_id});
    assert.equal(note.statusCode,201,note.body?.error);
    assert.equal(note.body.data.profesional_id,cfg.profile_id);
    await db.query(`insert into crm_notas_clinicas(paciente_id,nota,fecha,session_datetime,dolor_eva)
      select $1,'Older fixture '||n,date '2030-01-01'+n,(date '2030-01-01'+n)::timestamptz,8 from generate_series(1,31) n`,[recordPatientId]);
    const evolution=()=>invoke(notes,'get','/evolution/:paciente_id',{}, {paciente_id:recordPatientId});
    const current=await evolution();
    assert.equal(current.statusCode,200,current.body?.error);
    assert.match(current.body.longitudinal_summary,/30 sesiones/);
    assert.match(current.body.longitudinal_summary,/Latest fixture note/);
    assert.equal(current.body.total,32);
    assert.equal((await invoke(notes,'patch','/:id',{nota:'Corrected fixture note',dolor_eva:1}, {id:note.body.data.id})).statusCode,200);
    assert.match((await evolution()).body.longitudinal_summary,/Corrected fixture note/);
    await db.query('delete from crm_notas_clinicas where paciente_id=$1 and id<>$2',[recordPatientId,note.body.data.id]);
    assert.equal((await invoke(notes,'delete','/:id',{}, {id:note.body.data.id})).statusCode,200);
    assert.equal((await evolution()).body.longitudinal_summary,null);
    assert.equal((await invoke(patients,'delete','/:id',{}, {id:recordPatientId})).statusCode,204);
    assert.equal((await db.query('select activo from crm_pacientes where id=$1',[recordPatientId])).rows[0].activo,false);
    console.log('PASS: patient creation/edit/deactivation preserves records; notes derive the author and refresh the latest-30 summary after edit/delete.');
  } finally { globalThis.fetch = nativeFetch; await db.exec('reset role'); }
}
