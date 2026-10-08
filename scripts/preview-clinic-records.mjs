// Test-only UI/HTTP/SQL rehearsal. No real Supabase Auth or PostgREST.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createLocalQueryClient } from './local-query-client.mjs';

export async function previewClinicRecords(db, cfg, { calendar = false } = {}) {
  Object.assign(process.env, { SUPABASE_URL:'https://example.invalid', SUPABASE_ANON_KEY:'local-anon', SUPABASE_SERVICE_ROLE_KEY:'local-fixture', NODE_ENV:'development', FRONTEND_URL:'http://127.0.0.1:4322', FRONTEND_URLS:'' });
  for (const key of Object.keys(process.env)) if (/^(GOOGLE_|W5_|W6_|N8N_|TELEGRAM_|OPENWA_|OPENAI_)/.test(key)) delete process.env[key];
  let calendarReadMode = 'empty', calendarPatientId, calendarRouter, nativeCalendarRequest, JWT;
  if (calendar) {
    // An independent fictional clinic prevents restored patient records reaching the browser.
    await db.exec('reset role');
    cfg = { ...cfg, clinic_id: randomUUID(), profile_id: randomUUID(), auth_user_id: '00000000-0000-4000-8000-000000000811', clinic_name: 'Clínica de ensayo local' };
    await db.query("insert into auth.users(id,email) values($1,'calendar-browser@example.invalid')", [cfg.auth_user_id]);
    await db.query('insert into crm_clinicas(id,nombre) values($1,$2)', [cfg.clinic_id, cfg.clinic_name]);
    await db.query("insert into crm_perfiles(id,auth_user_id,rol,nombre_completo,clinica_id) values($1,$2,'admin','Profesional de ensayo',$3)", [cfg.profile_id,cfg.auth_user_id,cfg.clinic_id]);
    calendarPatientId = (await db.query("insert into crm_pacientes(nombre,email,created_by_profile_id,clinica_id) values('Prueba Calendar','qa-calendar@example.invalid',$1,$2) returning id", [cfg.profile_id,cfg.clinic_id])).rows[0].id;
    await db.query("insert into crm_citas(paciente_id,fisioterapeuta_id,inicio_en,fin_en,motivo,calendar_sync_pending,calendar_sync_operation_id,calendar_sync_calendar_id) values($1,$2,'2026-10-08T09:00Z','2026-10-08T10:00Z','Sesión ficticia',true,$3,'fixture-calendar')", [calendarPatientId,cfg.profile_id,randomUUID()]);
    Object.assign(process.env,{ GOOGLE_CALENDAR_ID:'fixture-calendar', GOOGLE_CLIENT_EMAIL:'calendar@example.invalid', GOOGLE_PRIVATE_KEY:'fixture-key' });
    ({default:calendarRouter}=await import('../backend/src/routes/professional.js?browser-calendar'));
    ({JWT}=await import('../backend/node_modules/google-auth-library/build/src/index.js'));
    nativeCalendarRequest = JWT.prototype.request;
    JWT.prototype.request = async options => {
      assert.equal(options.method,'GET','Browser recovery must never write Calendar');
      const url = new URL(options.url);
      assert.equal(url.origin,'https://www.googleapis.com');
      if (!url.pathname.includes('/calendars/fixture-calendar/events') || calendarReadMode === 'empty') return {data:{items:[]}};
      const row=(await db.query('select to_jsonb(c) row from crm_citas c where paciente_id=$1',[calendarPatientId])).rows[0].row;
      const event={ id:'fixture-browser-event',status:'confirmed',summary:'Cita fisioterapia - Prueba Calendar',
        description:`Paciente: Prueba Calendar\nFisioterapeuta: Profesional de ensayo\nCRM Appointment ID: ${row.id}\nCRM Sync Operation: ${row.calendar_sync_operation_id}\nMotivo: Sesión ficticia`,
        start:{dateTime:row.inicio_en},end:{dateTime:row.fin_en} };
      return {data:url.pathname.includes('/events/') ? event : {items:[event]}};
    };
  }
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('External network blocked in browser rehearsal'); };
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const express = require('express');
  const [{default:patients},{default:notes},{runWithRequestContext},{default:authRouter},{readBrowserCookie,requireBrowserOrigin}] = await Promise.all([
    import('../backend/src/routes/patients.js'), import('../backend/src/routes/clinical-notes.js'), import('../backend/src/lib/supabase.js'), import('../backend/src/routes/auth.js'), import('../backend/src/lib/browser-session.js'),
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [cfg.auth_user_id]);
  await db.exec('set role authenticated');
  const client = createLocalQueryClient(db);
  const user = {id:cfg.auth_user_id,email:'qa-browser@example.invalid',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'local-fixture'].join('.');
  const auth = {user_id:user.id,profile_id:cfg.profile_id,clinic_id:cfg.clinic_id,clinic_name:cfg.clinic_name,role:'admin',name:'Prueba local',email:user.email};
  let recoveryChallenge;
  globalThis.fetch = (input, options={}) => {
    const url=new URL(input), headers=new Headers(options.headers);
    if(url.origin!=='https://example.invalid') throw new Error('External network blocked in browser rehearsal');
    const body=options.body ? JSON.parse(options.body) : {};
    if(url.pathname==='/auth/v1/token') {
      if(url.searchParams.get('grant_type')==='password' && (body.email!==user.email || body.password!=='local-fixture-only')) return Promise.resolve(Response.json({message:'Invalid fixture credentials'},{status:400}));
      if(url.searchParams.get('grant_type')==='pkce' && (body.auth_code!=='fixture-recovery-code' || createHash('sha256').update(body.code_verifier).digest('base64url')!==recoveryChallenge)) return Promise.resolve(Response.json({message:'Invalid fixture recovery'},{status:400}));
      return Promise.resolve(Response.json({access_token:token,refresh_token:'local-fixture',expires_in:3600,token_type:'bearer',user}));
    }
    if(url.pathname==='/auth/v1/recover') {recoveryChallenge=body.code_challenge;return Promise.resolve(Response.json({}));}
    if(url.pathname==='/auth/v1/user') {
      if(headers.get('authorization')!==`Bearer ${token}`) return Promise.resolve(Response.json({message:'Expired fixture token'},{status:401}));
      return Promise.resolve(Response.json(user));
    }
    if(url.pathname==='/rest/v1/crm_perfiles') return Promise.resolve(Response.json([{id:cfg.profile_id,auth_user_id:user.id,rol:'admin',activo:true,clinica_id:cfg.clinic_id,crm_clinicas:{id:cfg.clinic_id,nombre:cfg.clinic_name,activo:true}}]));
    if(url.pathname==='/auth/v1/logout') return Promise.resolve(new Response(null,{status:204}));
    throw new Error('External network blocked in browser rehearsal');
  };
  const app = express();
  app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4322');
    res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,idempotency-key,x-fisio-csrf');
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
    if(req.method==='OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({limit:'512kb'}));
  app.use('/api/auth',authRouter);
  app.use((req,res,next)=>{
    // Synthetic sessions remain usable after restarting this disposable rehearsal.
    let valid=false;
    try {
      const parts=String(req.get('authorization') || readBrowserCookie(req,'access') || '').replace(/^Bearer /,'').split('.');
      const claims=JSON.parse(Buffer.from(parts[1] || '', 'base64url').toString());
      valid=parts.length===3 && parts[2]==='local-fixture' && claims.sub===user.id && claims.exp>Math.floor(Date.now()/1000);
    } catch {}
    if(!valid) return res.status(401).json({error:'Local fixture session required',code:'AUTH_SESSION_REQUIRED'});
    if(!req.get('authorization')) {
      let allowed=false; requireBrowserOrigin(req,res,()=>{allowed=true;}); if(!allowed)return;
    }
    req.id=randomUUID(); req.auth=auth;
    runWithRequestContext({supabase:client,auth},next);
  });
  app.get('/api/me',(_req,res)=>res.json(auth));
  app.get('/api/health',(_req,res)=>res.json({ok:true,environment:'local browser rehearsal'}));
  // Controllable local faults: writes reach SQL before their response is held. Never mounted by the production app.
  let failNotesRead=false, holdWrites=false, dropWrites=false;
  const held=[];
  app.post('/__faults',(req,res)=>{
    failNotesRead=req.body.failNotesRead===true; holdWrites=req.body.holdWrites===true;
    dropWrites=req.body.dropWrites===true;
    if(calendar && ['empty','confirmed'].includes(req.body.calendarReadMode)) calendarReadMode=req.body.calendarReadMode;
    if(req.body.release===true) held.splice(0).forEach(send=>send());
    res.json({failNotesRead,holdWrites,dropWrites,held:held.length});
  });
  app.use((req,res,next)=>{
    if(!req.path.startsWith('/api/notas-clinicas') && !req.path.startsWith('/api/pacientes')) return next();
    if(failNotesRead && req.method==='GET') return res.status(503).json({error:'Local injected read failure'});
    if((holdWrites || dropWrites) && req.method==='POST' && ['/api/notas-clinicas','/api/pacientes'].includes(req.path)) {
      const json=res.json.bind(res);
      res.json=payload=>{
        if(res.statusCode>=400) return json(payload);
        if(dropWrites) {res.destroy();return res;}
        held.push(()=>json(payload)); return res;
      };
    }
    next();
  });
  app.use('/api/pacientes',patients);
  app.use('/api/notas-clinicas',notes);
  if(calendar) app.use('/api/profesional',calendarRouter);
  // Only fictitious records are included in this independent database receipt.
  app.get('/__verify',async (_req,res,next)=>{
    try {
      const patients=(await db.query("select id,nombre,apellidos,activo from crm_pacientes where email in ('qa-ui@example.invalid','qa-ui-b@example.invalid')")).rows;
      const notes=(await db.query("select n.id,n.paciente_id,n.nota,n.dolor_eva,n.profesional_id from crm_notas_clinicas n join crm_pacientes p on p.id=n.paciente_id where p.email in ('qa-ui@example.invalid','qa-ui-b@example.invalid')")).rows;
      const appointments=calendar ? (await db.query('select id,calendar_sync_pending,calendar_sync_in_flight,google_calendar_event_id from crm_citas where paciente_id=$1',[calendarPatientId])).rows : [];
      res.json({patients,notes,appointments,expected_author:cfg.profile_id});
    } catch(error) {next(error);}
  });
  app.use((_req,res)=>res.status(503).json({error:'Module outside local patient/note rehearsal'}));
  app.use((err,_req,res,_next)=>res.status(err.status || 500).json({error:err.message}));
  const server=await new Promise((resolve,reject)=>{const s=app.listen(3002,'127.0.0.1',()=>resolve(s));s.once('error',reject);});
  console.log('LOCAL ONLY: API on 127.0.0.1:3002; synthetic Auth, external network blocked.');
  assert.throws(()=>globalThis.fetch('https://example.com'),/External network blocked/);
  try {await new Promise(resolve=>{
    const stop=()=>server.close(resolve);
    process.once('SIGINT',stop); process.once('SIGTERM',stop);
  });} finally {if(JWT) JWT.prototype.request=nativeCalendarRequest;globalThis.fetch=nativeFetch;await db.exec('reset role');}
}
