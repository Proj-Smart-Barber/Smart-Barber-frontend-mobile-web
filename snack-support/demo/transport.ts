import { ApiError } from '../src/shared/api/api-errors';
import { AvailabilityMockAdapter } from '../src/features/availability/api/availability.mock';
import type { RequestOptions } from '../src/shared/api/http-client';
import type { BookingDto } from '../src/features/bookings/api/bookings.dto';
import type { Service } from '../src/features/services/model/service.types';
import type { ScheduleScopeDocument } from '../src/features/availability/api/availability.contract';

// Intentionally ephemeral. Never falls through to a production API.
const uid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const SHOP_ID=uid(1);
const now=()=>new Date().toISOString();
let sequence=100;
const nextId=()=>uid(++sequence);
const fail=(message:string,status=400):never=>{throw new ApiError(message,status,{code:'DEMO_ERROR'},false);};
const users:any[]=[
  {id:uid(2),name:'Alex • Proprietário',email:'dono@demo.test',accountType:'OWNER'},
  {id:uid(3),name:'Bruno • Barbeiro',email:'barbeiro@demo.test',accountType:'BARBER'},
  {id:uid(4),name:'Clara • Cliente',email:'cliente@demo.test',accountType:'CLIENT'},
].map(u=>({...u,password:'Demo123!',emailVerifiedAt:now(),createdAt:now(),credentialVersion:1}));
let current:any=null;
const shop:any={id:SHOP_ID,name:'Obsidian Atelier • Demo',slug:'obsidian-demo',ownerId:uid(2),cnpj:'00000000000000',location:'São Paulo • endereço fictício',timezone:'America/Sao_Paulo',status:'ACTIVE',avatarUrl:null,coverUrl:null,coordinates:null,distanceMeters:null,reviewCount:0,rating:null,createdAt:now()};
const services:Service[]=[['Corte clássico',4500,30],['Barba',3000,30],['Corte e barba',7000,60]].map(([title,price,duration],i)=>({id:uid(10+i),barbershopId:SHOP_ID,title:String(title),description:'Serviço demonstrativo',priceInCents:Number(price),durationInMinutes:Number(duration),isActive:true,createdAt:now(),updatedAt:now()}));
const members:any[]=users.filter(u=>u.accountType!=='CLIENT').map(u=>({membershipId:nextId(),userId:u.id,name:u.name,email:u.email,role:u.accountType==='OWNER'?'OWNER':'BARBERMAN',state:'ACTIVE',version:1,joinedAt:now()}));
const bookings:BookingDto[]=[];
const invitations:any[]=[];
const financeEntries:any[]=[];
const reviews:any[]=[];
const attempts=new Map<string,any>();
let availability:AvailabilityMockAdapter|undefined;
const schedules=()=>availability??(availability=new AvailabilityMockAdapter(0));
let ready:Promise<void>|undefined;
function initialize() {
  return ready??(ready=Promise.all(members.map(m=>schedules().saveScheduleScope(SHOP_ID,{barbermanId:m.userId,state:'INHERIT',expectedVersion:1,requestId:'seed-'+m.userId,entries:[]}))).then(()=>undefined));
}
const page=(items:any[],params:any={})=>({items,total:items.length,page:Number(params.page||1),limit:Number(params.limit||50),hasNext:false,serverTime:now()});
const requireUser=()=>current??fail('Entre com uma conta demonstrativa.',401);
const requireOwner=()=>{if(requireUser().accountType!=='OWNER')fail('Somente o proprietário pode realizar esta ação.',403);};
const grant=()=>({access_token:'demo-'+requireUser().id,refresh_token:'demo-session',serverTime:now(),accessExpiresAt:new Date(Date.now()+86400000).toISOString(),sessionExpiresAt:new Date(Date.now()+86400000).toISOString()});
const scopeDto=(scope:ScheduleScopeDocument)=>({...scope,serverTime:now(),schedules:scope.schedules.map(e=>({id:e.id,dayOfWeek:e.weekday,barbermanId:e.barbermanId,openTime:e.range.start,closeTime:e.range.end})),effectiveSchedules:scope.effectiveSchedules.map(e=>({id:e.id,dayOfWeek:e.weekday,barbermanId:e.barbermanId,openTime:e.range.start,closeTime:e.range.end}))});
const toMinutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;

async function slotsFor(date:string,serviceIds:string[],barbermanId:string,exclude?:string) {
  const selected=services.filter(s=>serviceIds.includes(s.id)&&s.isActive);
  if(!selected.length||selected.length!==new Set(serviceIds).size) return [];
  const duration=selected.reduce((n,s)=>n+s.durationInMinutes,0);
  const scope=await schedules().getScheduleScope(SHOP_ID,barbermanId);
  const general=await schedules().getScheduleScope(SHOP_ID);
  const exceptions=[...await schedules().listExceptions(SHOP_ID),...await schedules().listExceptions(SHOP_ID,barbermanId)];
  const weekday=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date(date+'T12:00:00-03:00').getUTCDay()];
  const result:{start:string;end:string}[]=[];
  for(const period of scope.effectiveSchedules.filter(e=>e.weekday===weekday)) {
    for(let start=toMinutes(period.range.start);start+duration<=toMinutes(period.range.end);start+=15) {
      const end=start+duration;
      if(!general.effectiveSchedules.some(e=>e.weekday===weekday&&start>=toMinutes(e.range.start)&&end<=toMinutes(e.range.end)))continue;
      if(exceptions.some(e=>e.date===date&&(!e.barbermanId||e.barbermanId===barbermanId)&&(!e.openTime||!e.closeTime||(start<toMinutes(e.closeTime)&&end>toMinutes(e.openTime)))))continue;
      const startIso=date+'T'+time(start)+':00-03:00', endIso=date+'T'+time(end)+':00-03:00';
      if(Date.parse(startIso)<=Date.now())continue;
      if(bookings.some(b=>b.id!==exclude&&b.date===date&&b.barbermanId===barbermanId&&b.status!=='CANCELLED'&&start<toMinutes(b.endTime!)&&end>toMinutes(b.startTime!)))continue;
      result.push({start:startIso,end:endIso});
    }
  }
  return result;
}
function visibleBooking(id:string) {
  const user=requireUser(),b=bookings.find(b=>b.id===id);
  if(!b) return fail('Agendamento não encontrado.',404);
  if(user.accountType==='CLIENT'&&b.customerId!==user.id)fail('Sem acesso a este agendamento.',403);
  if(user.accountType==='BARBER'&&b.barbermanId!==user.id)fail('Sem acesso a este agendamento.',403);
  return b;
}
function withCapabilities(b:BookingDto) {
  const active=b.status==='CONFIRMED';
  return {...b,serverTime:now(),capabilities:{cancel:{allowed:active},reschedule:{allowed:active},complete:{allowed:active&&current?.accountType!=='CLIENT'},noShow:{allowed:active&&current?.accountType!=='CLIENT'}}};
}
async function createOrMove(body:any,old?:BookingDto) {
  const user=requireUser();
  const ids=body.serviceIds??old?.services.map(s=>s.serviceId);
  const barber=body.barbermanId??old?.barbermanId;
  if(!members.some(m=>m.userId===barber&&m.state==='ACTIVE'))fail('Profissional indisponível.');
  const offered=await slotsFor(body.date,ids,barber,old?.id);
  const selected=offered.find(s=>body.slotStartAt?Date.parse(s.start)===Date.parse(body.slotStartAt):s.start.slice(11,16)===body.startTime);
  if(!selected) return fail('Horário indisponível. Atualize a seleção.',409);
  const chosen=services.filter(s=>ids.includes(s.id));
  const total=chosen.reduce((n,s)=>n+s.priceInCents,0),duration=chosen.reduce((n,s)=>n+s.durationInMinutes,0);
  if(body.expectedTotalPriceInCents!=null&&body.expectedTotalPriceInCents!==total)fail('Preço alterado.',409);
  const customer=users.find(u=>u.id===(body.customerId??old?.customerId??user.id));
  if(!customer)fail('Cliente demonstrativo não encontrado.');
  const b:BookingDto={id:old?.id??nextId(),barbershopId:SHOP_ID,barbershopName:shop.name,barbermanId:barber,barbermanName:users.find(u=>u.id===barber)?.name,customerId:customer.id,customer:{id:customer.id,name:customer.name},services:chosen.map(s=>({...s,serviceId:s.id})),date:body.date,startTime:selected.start.slice(11,16),endTime:selected.end.slice(11,16),startsAt:selected.start,endsAt:selected.end,timezone:shop.timezone,status:'CONFIRMED',version:(old?.version??0)+1,totalPriceInCents:total,totalDurationInMinutes:duration,createdAt:old?.createdAt??now(),serverTime:now()};
  if(old)Object.assign(old,b); else bookings.push(b);
  return {booking:withCapabilities(b),serverTime:now()};
}

export async function demoRequest(rawPath:string,options:RequestOptions={}):Promise<any> {
  await initialize();
  if(options.signal?.aborted)throw new Error('Operação cancelada.');
  const url=new URL(rawPath,'https://demo.invalid');
  const p=url.pathname.replace(/\/$/,'');
  const q:any=Object.fromEntries(url.searchParams);Object.assign(q,options.params??{});
  const method=options.method??'GET',body=options.body??{};
  const key=(options.headers as Record<string,string>|undefined)?.['Idempotency-Key'];
  if(method!=='GET'&&key&&attempts.has(key))return JSON.parse(JSON.stringify(attempts.get(key)));
  const result=await route();
  if(method!=='GET'&&key)attempts.set(key,result);
  return result===undefined?undefined:JSON.parse(JSON.stringify(result));
  async function route():Promise<any> {
    if(p.endsWith('/sessions/auth')) {
      const found=users.find(u=>u.email.toLowerCase()===String(body.email).toLowerCase()&&u.password===body.password);
      if(!found)fail('Use as contas demonstrativas e a senha Demo123!.',401);
      current=found;return grant();
    }
    if(p.endsWith('/sessions/refresh'))return grant();
    if(/\/sessions\/(sign-out|logout-all)$/.test(p)){current=null;return;}
    if(p==='/api/users'&&method==='POST') {
      if(users.some(u=>u.email===body.email))fail('E-mail já cadastrado.',409);
      const user={...body,id:nextId(),accountType:body.accountType??'CLIENT',emailVerifiedAt:now(),createdAt:now()};users.push(user);return {userId:user.id};
    }
    if(p==='/api/users/me/barbershops'){const u=requireUser();return {barbershops:u.accountType==='CLIENT'?[]:[{...shop,role:u.accountType==='OWNER'?'OWNER':'BARBERMAN',state:'ACTIVE'}]};}
    if(p==='/api/users/me') {const u=requireUser();if(method==='PATCH'){for(const field of ['name','phoneNumber','avatarUrl'])if(field in body)u[field]=body[field];}return {user:{...u,password:undefined},staff:u.accountType==='CLIENT'?null:{id:u.id,name:u.name,role:u.accountType==='OWNER'?'OWNER':'BARBERMAN'}};}
    if(/verification-email|password-recovery|\/me\/password/.test(p))fail('Envio de e-mail e alteração de senha não são executados nesta demonstração.',501);
    if(p==='/api/barbershops/explore-feed')return {items:[{barbershop:{...shop,logoUrl:null},distanceMeters:null,distanceBasis:'unavailable',rankingScore:{score:1,reputationComponent:0,bayesRating:0},media:[]}],nextCursor:null,hasNext:false,total:1,rankingVersion:'demo',snapshotExpiresAt:new Date(Date.now()+3600000).toISOString()};
    if(p==='/api/barbershops'||p==='/api/barbershops/nearby') {
      if(method==='POST'&&p==='/api/barbershops'){requireOwner();Object.assign(shop,body);return {barbershopId:SHOP_ID};}
      return page([shop].filter(s=>!q.q||s.name.toLowerCase().includes(String(q.q).toLowerCase())),q);
    }
    if(p===`/api/barbershops/${SHOP_ID}`)return {barbershop:shop};
    if(p.endsWith('/professionals')&&!p.includes('/review-insights/'))return {professionals:members.filter(m=>m.state==='ACTIVE').map(m=>({id:m.userId,name:m.name,role:m.role}))};
    const serviceMatch=p.match(/\/services(?:\/([^/]+))?(?:\/(activation))?$/);
    if(serviceMatch&&!p.includes('/review-insights/')){const id=serviceMatch[1];if(method==='GET')return id?{service:services.find(s=>s.id===id)}:page(services.filter(s=>q.includeInactive===true||q.includeInactive==='true'||s.isActive),q);requireOwner();if(!id){const service={...body,id:nextId(),barbershopId:SHOP_ID,isActive:true,createdAt:now(),updatedAt:now()};services.push(service);return {service};}const s=services.find(s=>s.id===id);if(!s)fail('Serviço não encontrado.',404);Object.assign(s!,body,{updatedAt:now()});return {service:s};}
    if(p.endsWith('/team'))return {...page(members.filter(m=>!q.state||m.state===q.state),q),members:members.filter(m=>!q.state||m.state===q.state)};
    const memberMatch=p.match(/\/team\/([^/]+)(?:\/(deactivation))?$/);
    if(memberMatch){requireOwner();const member=members.find(m=>m.membershipId===memberMatch[1]);if(!member)fail('Profissional não encontrado.',404);if(method==='PATCH'){if(body.expectedVersion!==member.version)fail('Versão desatualizada.',409);member.state='INACTIVE';member.version++;member.endedAt=now();return member;}return {member};}
    if(p.endsWith('/barber-registrations')){requireOwner();const invitation={id:nextId(),email:body.email,name:body.name,role:'BARBERMAN',status:'PENDING',expiresAt:new Date(Date.now()+86400000).toISOString(),createdAt:now()};invitations.push(invitation);return {registrationId:invitation.id,invitationId:invitation.id,email:invitation.email,requiresExistingAccountLogin:true,status:'PENDING',deliveryStatus:'PENDING'};}
    if(p.endsWith('/invitations'))return {...page(invitations,q),invitations};
    if(p.endsWith('/notifications'))return {notifications:[],nextCursor:null,unreadCount:0,total:0,page:1,limit:20,hasNext:false};
    if(p.includes('/finance')) {
      requireOwner(); const today=now().slice(0,10);
      if(p.endsWith('/finance')) {
        const from=q.from??`${q.month??today.slice(0,7)}-01`,to=q.to??`${q.month??today.slice(0,7)}-31`;
        const entries=financeEntries.filter(e=>e.dueOn>=from&&e.dueOn<=to);
        const list=bookings.filter(b=>String(b.date)>=from&&String(b.date)<=to);
        const sum=(items:any[])=>items.reduce((n,e)=>n+e.amountInCents,0);
        const paid=sum(entries.filter(e=>e.kind==='EXPENSE'&&e.status==='PAID'));
        const received=sum(entries.filter(e=>e.kind==='RECEIPT'&&e.status==='PAID'));
        return {month:q.month??from.slice(0,7),from,to,today,timezone:shop.timezone,serverTime:now(),entries,entriesTotal:entries.length,bookingsTotal:list.length,bookings:list.map(b=>({id:b.id,date:b.date,status:b.status,professional:b.barbermanName??'',services:b.services.map(s=>s.title).join(', '),amountInCents:b.totalPriceInCents??0,receiptId:financeEntries.find(e=>e.bookingId===b.id)?.id??null})),summary:{completedInCents:list.filter(b=>b.status==='COMPLETED').reduce((n,b)=>n+(b.totalPriceInCents??0),0),forecastInCents:list.filter(b=>b.status==='CONFIRMED').reduce((n,b)=>n+(b.totalPriceInCents??0),0),receivedInCents:received,paidInCents:paid,payableInCents:sum(entries.filter(e=>e.kind==='EXPENSE'&&e.status==='PLANNED')),balanceInCents:received-paid,unknownPrices:0,daily:[]}};
      }
      if(p.endsWith('/entries')&&method==='POST'){const entry={...body,id:nextId(),kind:'EXPENSE',status:'PLANNED',paidOn:null,bookingId:null,version:1};financeEntries.push(entry);return entry;}
      const entry=financeEntries.find(e=>p.includes('/entries/'+e.id));
      if(entry&&method==='PATCH'){if(entry.version!==body.expectedVersion)fail('Lançamento desatualizado.',409);entry.status=body.action==='PAY'?'PAID':'CANCELLED';entry.paidOn=body.action==='PAY'?(body.paidOn??today):null;entry.version++;return entry;}
      if(entry&&p.endsWith('/copy')){const copy={...entry,id:nextId(),status:'PLANNED',paidOn:null,version:1};financeEntries.push(copy);return copy;}
      if(p.endsWith('/receipts')){const b=visibleBooking(body.bookingId);if(b.status!=='COMPLETED')fail('Conclua o atendimento antes do recebimento.');if(financeEntries.some(e=>e.bookingId===b.id))fail('Recebimento já registrado.',409);const receipt={id:nextId(),kind:'RECEIPT',category:'SERVICE',description:'Atendimento demonstrativo',amountInCents:b.totalPriceInCents??0,dueOn:String(b.date),paidOn:body.paidOn,payee:b.customer?.name??'',status:'PAID',bookingId:b.id,version:1};financeEntries.push(receipt);return receipt;}
    }
    if(p.includes('/review-insights/')) {
      requireOwner();const distribution:any={1:0,2:0,3:0,4:0,5:0};reviews.forEach(r=>distribution[r.rating]++);
      const count=reviews.length,average=count?reviews.reduce((n,r)=>n+r.rating,0)/count:null;
      if(p.endsWith('/summary'))return {metrics:{averageRating:average,reviewCount:count,distribution,percentage1to2Stars:count?(distribution[1]+distribution[2])*100/count:0,isSmallSample:count<10},comparison:{previousPeriodStart:now(),previousPeriodEnd:now(),previousAverageRating:null,previousReviewCount:0,ratingDiff:null,reviewCountDiff:count},responseRate:{cohortCompletedBookings:bookings.filter(b=>b.status==='COMPLETED').length,reviewedBookings:count,ratePercentage:null,cohortDefinition:'Sessão demonstrativa'},serviceCoverage:{totalActiveServices:services.length,evaluatedActiveServices:0,coveragePercentage:null},latestReview:count?{...reviews[count-1],customerName:reviews[count-1].author.name,source:'DEMO'}:null,flags:{hasAnyReviews:count>0,hasDemoReviews:count>0,hasCustomerReviews:false,isDemoEnvironment:true,appliedSource:'DEMO'},period:{startDate:q.startDate??now().slice(0,10),endDate:q.endDate??now().slice(0,10),timezone:shop.timezone}};
      if(p.endsWith('/feedbacks'))return page(reviews.map(r=>({id:r.id,bookingId:r.bookingId,source:'DEMO',createdAt:r.createdAt,customer:{name:r.author.name,avatarUrl:null},generalComment:r.comment??null,barbershopRating:r.rating,items:r.items??[]})),q);
      if(p.endsWith('/services'))return {items:[],totalServices:services.length,evaluatedServices:0,coveragePercentage:null};
      return {items:[],totalProfessionals:members.length};
    }
    if(p.endsWith('/reviews')&&method==='GET')return {reviews,total:reviews.length,averageRating:reviews.length?reviews.reduce((n,r)=>n+r.rating,0)/reviews.length:0,reviewCount:reviews.length};
    const reviewBooking=p.match(/\/bookings\/([^/]+)\/review$/);
    if(reviewBooking){const b=visibleBooking(reviewBooking[1]);const index=reviews.findIndex(r=>r.bookingId===b.id);if(method==='GET')return {review:reviews[index]??null};if(requireUser().id!==b.customerId||b.status!=='COMPLETED')fail('Avaliação disponível ao cliente após concluir o atendimento.',403);if(method==='DELETE'){if(index>=0)reviews.splice(index,1);return;}const rating=body.barbershopRating??body.rating;if(!Number.isInteger(rating)||rating<1||rating>5)fail('Selecione de 1 a 5 estrelas.');const review={...body,id:index>=0?reviews[index].id:nextId(),bookingId:b.id,rating,createdAt:now(),status:'PUBLISHED',version:(reviews[index]?.version??0)+1,author:{id:current.id,name:current.name}};if(index>=0)reviews[index]=review;else reviews.push(review);return {review};}
    if(p.endsWith('/schedules')) {
      const barber=q.barbermanId||undefined;
      if(method==='GET')return scopeDto(await schedules().getScheduleScope(SHOP_ID,barber));
      const user=requireUser();if(user.accountType!=='OWNER'&&user.id!==barber)fail('Sem permissão.',403);
      if(!body.state){await schedules().saveWeeklySchedule(SHOP_ID,body.schedules.map((s:any)=>({weekday:s.dayOfWeek,barbermanId:barber??null,range:{start:s.openTime,end:s.closeTime}})),barber);return scopeDto(await schedules().getScheduleScope(SHOP_ID,barber));}
      return scopeDto(await schedules().saveScheduleScope(SHOP_ID,{barbermanId:barber??null,state:body.state,expectedVersion:body.expectedVersion,requestId:key??nextId(),entries:body.schedules.map((s:any)=>({weekday:s.dayOfWeek,barbermanId:barber??null,range:{start:s.openTime,end:s.closeTime}}))}));
    }
    if(p.includes('/schedule-exceptions')) {
      const id=p.split('/schedule-exceptions/')[1];
      if(method==='GET')return {exceptions:await schedules().listExceptions(SHOP_ID,q.barbermanId)};
      requireOwner();const data={date:body.date,barbermanId:body.barbermanId??null,openTime:body.startTime??body.openTime??null,closeTime:body.endTime??body.closeTime??null,reason:body.reason??null};
      if(method==='DELETE')return schedules().removeException(SHOP_ID,id);
      const exception=method==='POST'?await schedules().createException(SHOP_ID,data):await schedules().updateException(SHOP_ID,id,data);return {exception,exceptionId:exception.id};
    }
    if(p.endsWith('/availability'))return {slots:await slotsFor(q.date,String(q.serviceIds).split(','),q.barbermanId||uid(3)),serverTime:now()};
    if(p.includes('/customers/lookup')){requireUser();const u=users.find(u=>u.email===body.email&&u.accountType==='CLIENT');if(!u)fail('Use cliente@demo.test na busca demonstrativa.',404);return {id:u.id,name:u.name,maskedEmail:u.email,isEligible:true};}
    if(p==='/api/bookings'&&method==='POST')return createOrMove(body);
    if(p==='/api/bookings/me'||p.endsWith('/bookings')||p.endsWith('/schedule/details')) {
      const u=requireUser();let list=bookings.filter(b=>(u.accountType!=='CLIENT'||b.customerId===u.id)&&(u.accountType!=='BARBER'||b.barbermanId===u.id)&&(!q.date||b.date===q.date)&&(!q.barbermanId||b.barbermanId===q.barbermanId)&&(!q.status||b.status===q.status));
      if(q.view==='upcoming')list=list.filter(b=>Date.parse(b.startsAt!)>Date.now()&&b.status==='CONFIRMED');
      const items=list.map(withCapabilities);return {...page(items,q),bookings:items,summary:{totalBookings:items.length,totalAmountInCents:items.reduce((n,b)=>n+(b.totalPriceInCents??0),0),totalRevenueInCents:items.reduce((n,b)=>n+(b.totalPriceInCents??0),0)}};
    }
    const match=p.match(/^\/api\/bookings\/([^/]+)(?:\/(cancel|reschedule|status))?$/);
    if(match){const b=visibleBooking(match[1]);if(method==='GET')return {booking:withCapabilities(b)};if(body.expectedVersion!==b.version)fail('Agendamento alterado. Atualize a tela.',409);if(b.status!=='CONFIRMED')fail('Agendamento não está ativo.',409);if(match[2]==='reschedule')return createOrMove(body,b);if(match[2]==='status'&&requireUser().accountType==='CLIENT')fail('Sem permissão.',403);b.status=match[2]==='cancel'?'CANCELLED':body.status;b.version=(b.version??0)+1;return {booking:withCapabilities(b),serverTime:now()};}
    if(p.startsWith('/api/operation-attempts/'))fail('Tentativa não encontrada.',404);
    fail('Recurso não simulado nesta entrega: '+p+'. Consulte docs/EXPO_SNACK.md.',501);
  }
}
