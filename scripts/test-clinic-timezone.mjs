import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadFrontendModule} from './load-frontend-module.mjs';
if(!process.argv.includes('--worker')){
  for(const TZ of ['UTC','America/Los_Angeles','Europe/Madrid']){
    const output=execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--worker'],{env:{...process.env,TZ},encoding:'utf8'});
    process.stdout.write(TZ+': '+output);
  }
}else{
  const dates=await loadFrontendModule('lib/appointments.ts');
  const {transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
  const source=readFileSync(process.env.FISIO_INDEX_SOURCE || new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
  const section=(start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from,start);return source.slice(from,to);};
  assert.equal(dates.clinicDateTimeToDate('2026-10-15T09:00').toISOString(),'2026-10-15T07:00:00.000Z');
  assert.equal(dates.clinicDateTimeToDate('2026-12-15T09:00').toISOString(),'2026-12-15T08:00:00.000Z');
  assert.throws(()=>dates.clinicDateTimeToDate('2026-03-29T02:30'),/cambio horario/);
  assert.throws(()=>dates.clinicDateTimeToDate('2026-10-25T02:30'),/cambio horario/);
  assert.throws(()=>dates.clinicDateTimeToDate('2026-02-30T09:00'));
  assert.equal(dates.clinicDayKey('2026-10-11T22:30:00Z'),'2026-10-12');
  assert.equal(dates.clinicDayKey('invalid'),'');
  for(const[day,hours]of[['2026-03-23T12:00:00Z',167],['2026-10-19T12:00:00Z',169]]){
    const monday=dates.clinicWeekStart(day),next=dates.shiftClinicDays(monday,7);
    assert.equal((next-monday)/3600000,hours);assert.equal(dates.clinicDateTimeValue(monday).slice(11),'00:00');assert.equal(dates.clinicDateTimeValue(next).slice(11),'00:00');
  }
  const calendar={innerHTML:''},mobile={innerHTML:''};
  const context={...dates,Date,document:{getElementById:()=>calendar},escapeHtml:String,escapeAttr:String,getDashboardFirstName:String,getAgendaShortName:String,
    isCalendarOnlyAppointment:()=>false,isAllDayAppointment:()=>false,statusText:String,plural:(count,one,many)=>`${count} ${count===1?one:many}`,
    fmtHourOnly:iso=>new Date(iso).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:dates.CLINIC_TIME_ZONE}),
    summarizeCalendarOnlyBlocks:()=>({total:0,blocking:0}),agendaMobileList:mobile,agendaMobileSummary:{},
    isTodayDate:()=>false,getAgendaMirrorMeta:()=>({label:'CRM'})};
  runInNewContext(transpileModule(section('  const getWeekMonday =','  const fmtHourOnly =')+section('  const agendaWeekDays =','  let appointmentDetailId:')+'\nglobalThis.week=getWeekMonday;globalThis.calendar=renderAgendaCalendar;globalThis.mobile=renderAgendaMobileTimeline;',{}).outputText,context);
  const week=context.week(new Date('2026-10-12T12:00:00Z'));
  assert.equal(week.toISOString(),'2026-10-11T22:00:00.000Z','Week must begin at clinic midnight');
  const rows=[{id:'monday-9',inicio_en:'2026-10-12T07:00:00Z',nombre_paciente:'Lunes nueve',paciente_id:'A'},
    {id:'midnight',inicio_en:'2026-10-11T22:30:00Z',nombre_paciente:'Lunes madrugada',paciente_id:'B'}];
  context.calendar(rows,week);
  for(const[id,hour,time]of[['monday-9','09:00','09:00'],['midnight','00:00','00:30']]){
    const row=calendar.innerHTML.split('<div class="agenda-board-row').find(html=>html.includes(`data-cal-appt-id="${id}"`));
    assert.ok(row,id+' is visible');assert.ok(row.includes(`role="rowheader">${hour}`),id+' uses clinic hour row');
    assert.equal(row.slice(0,row.indexOf(`data-cal-appt-id="${id}"`)).split('role="gridcell"').length-1,1,id+' uses Monday column');
    assert.ok(row.includes(`agenda-event-time">${time}`));
  }
  context.mobile(rows,rows,week);assert.ok(mobile.innerHTML.startsWith('\n        <article')||mobile.innerHTML.startsWith('\n          <article'));
  const firstDay=mobile.innerHTML.split('<article class="agenda-mobile-day ')[1];
  assert.ok(firstDay.includes('Lunes nueve')&&firstDay.includes('Lunes madrugada'),'Both clinical Monday appointments stay together on mobile');
  assert.match(firstDay,/lunes,? 12 oct/i);
  // Exercise the actual GET caller; bounds cross the browser's Sunday/Monday boundary.
  const requests=[];Object.assign(context,{agendaWeekStart:week,agendaLoadVersion:0,BACKEND_BASE:'',PROF_ID:'professional',
    citasBody:null,dashCitasBody:{},isDevMode:false,setListState(){},getOperationalAgendaAppointments:rows=>rows,
    fetchJson:async url=>{requests.push(url);return{data:url.includes('/sync-calendar/')?{}:[]};},renderAgendaSyncStatus(){},renderAgendaCalendarMeta(){},renderDashboardCitas(){},
    getVisibleAgendaPatientCount:()=>0,latestAgendaAppointments:[]});
  runInNewContext(transpileModule(section('  const loadCitas = async () => {','  let agendaAutoRefreshHandle')+'\nglobalThis.load=loadCitas;',{}).outputText,context);
  await context.load();const request=new URL(requests[0],'https://fixture.invalid');
  assert.equal(request.searchParams.get('desde'),'2026-10-11T22:00:00.000Z');assert.equal(request.searchParams.get('hasta'),'2026-10-16T22:00:00.000Z');
  let submit;const writes=[],feedback=[];
  Object.assign(context,{appointmentForm:{addEventListener:(_name,handler)=>{submit=handler;}},appointmentPatientSelect:{value:'A'},
    appointmentStartInput:{value:'2026-10-15T09:00'},appointmentEndInput:{value:'2026-10-15T09:30'},appointmentReasonInput:{value:'Sesión'},appointmentSubmitBtn:{disabled:false},
    setAppointmentFormFeedback:text=>feedback.push(text),fetchJson:async(_url,options)=>{writes.push(JSON.parse(options.body));return{data:{id:'created'}};},
    pendingIntakeIdForAppointment:null,window:{setTimeout(){}},showToast(){}});
  runInNewContext(transpileModule(section("  appointmentForm?.addEventListener('submit'",'  // === APPOINTMENT ACTIONS')+'',{}).outputText,context);
  await submit({preventDefault(){}});assert.equal(writes.length,1);assert.equal(writes[0].inicio_en,'2026-10-15T07:00:00.000Z');assert.equal(writes[0].fin_en,'2026-10-15T07:30:00.000Z');
  context.appointmentStartInput.value='2026-10-25T02:30';context.appointmentEndInput.value='2026-10-25T03:30';
  await submit({preventDefault(){}});assert.equal(writes.length,1,'Ambiguous local time never issues a write');assert.match(feedback.at(-1),/cambio horario/);
  console.log('clinic input/UTC serialization, DST, desktop row/column, mobile grouping and GET bounds passed.');
}
