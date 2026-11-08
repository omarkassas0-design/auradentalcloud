import { createClient } from '@supabase/supabase-js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const cors = (request, response) => {
  const origin = request.headers.get('Origin') || '*';
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin); headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  return new Response(response.body, { status: response.status, headers });
};
function adminDb(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Worker secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function authenticate(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: json({ error: 'Unauthorized' }, 401) };
  const db = adminDb(env);
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { error: json({ error: 'Unauthorized' }, 401) };
  const { data: cra } = await db.from('ClinicRoleAssignment').select('*').eq('user_id', user.id).order('updated_date', { ascending: false }).limit(1).maybeSingle();
  const isOwner = !!env.OWNER_EMAIL && user.email?.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
  if (isOwner) {
    await db.from('User').upsert({id:user.id,email:user.email,role:'user',signup_status:'approved',full_name:user.user_metadata?.full_name||''},{onConflict:'id',ignoreDuplicates:true});
    await db.from('UserSecurityProfile').upsert({user_id:user.id,signup_status:'approved',assigned_by_id:'system'},{onConflict:'user_id',ignoreDuplicates:true});
  }
  const role = isOwner ? 'super_admin' : (cra?.role || null);
  const clinicId = isOwner ? null : (cra?.clinic_id || null);
  const { data: security } = await db.from('UserSecurityProfile').select('signup_status').eq('user_id', user.id).maybeSingle();
  let blockedStatus = null;
  if (!isOwner && security?.signup_status === 'pending') blockedStatus = 'pending';
  if (!isOwner && security?.signup_status === 'rejected') blockedStatus = 'rejected';
  if (!isOwner && cra?.status === 'pending') blockedStatus = 'pending';
  if (!isOwner && cra?.status === 'not_subscribed') blockedStatus = 'not_subscribed';
  return { db, user, role, clinicId, isOwner, blockedStatus, envOwnerEmail: env.OWNER_EMAIL || '' };
}
const FUNCTION_NAMES = new Set(["assignUserToClinic", "getPatientTimeline", "createNewClinic", "getBackupHistory", "getSuperAdminStats", "generateNotifications", "getPatientRecall", "restoreUser", "getCurrentUserRole", "searchPatients", "restoreClinicBackup", "getDashboardStats", "rejectRegistration", "completeClinicSetup", "saveDoctorCompensation", "linkExistingReceptionist", "executeClinicDeletion", "getPaginatedRecords", "cancelClinicDeletion", "secureExtractData", "checkPendingPermanentDeletion", "saveMessageTemplates", "getClinicExportData", "getReportsStats", "getSuperAdminUsers", "normalizeOwnerRoles", "getMonthlyExpenses", "restoreClinic", "clinicScopedCrud", "migrateLegacyFiles", "scheduleClinicDeletion", "executePermanentDeletion", "sendScheduledReports", "runAutomaticBackups", "approveRegistration", "getDoctorCommissionSummary", "schedulePermanentDeletion", "loadUserClinic", "finalizeLabCase", "saveClinicSettings", "softDeleteUser", "getPatientFileSignedUrl", "purgeRecycleBin", "createClinicBackup", "getPatientsForExport", "cancelPermanentDeletion", "checkPendingClinicDeletion", "pwaManifest", "savePayment", "getDoctorDashboard", "processPatientFileBatch", "linkExistingDoctor", "pwaServiceWorker"]);
async function currentUserRole(ctx) {
  const { data: assignment } = await ctx.db.from('ClinicRoleAssignment').select('role,clinic_id,status').eq('user_id', ctx.user.id).order('updated_date', { ascending: false }).limit(1).maybeSingle();
  return { role: ctx.blockedStatus === 'rejected' ? null : ctx.role, clinic_id: ctx.clinicId || assignment?.clinic_id || null, account_status: ctx.blockedStatus || assignment?.status || 'active' };
}
async function loadUserClinic(ctx, payload) {
  let clinicId = ctx.clinicId;
  if (ctx.role === 'super_admin') clinicId = payload?.clinic_id || null;
  if (!clinicId) return { clinic: null };
  const { data, error } = await ctx.db.from('Clinic').select('*').eq('id', clinicId).maybeSingle();
  if (error) throw error;
  if (!data || data.is_deleted || data.deletion_status === 'soft_deleted') throw Object.assign(new Error('Clinic is deleted or unavailable'), { status: 403 });
  return { clinic: data };
}
const CLINIC_ENTITIES = new Set(['Clinic','Patient','Appointment','Doctor','Staff','Treatment','PatientTreatment','PatientFile','Payment','Invoice','Expense','Purchase','DoctorPayout','LabCase','Laboratory','Notification','MessageLog','ReminderLog','Shift','ConsentForm','AuditLog','ScheduledReport','Backup']);
const ADMIN = ['super_admin','admin','clinic_admin'];
const RECEPTION = ['super_admin','admin','clinic_admin','receptionist'];
const DOCTOR_WRITE = ['super_admin','admin','clinic_admin','receptionist','doctor'];
const ENTITY_PERMS = {
 Clinic:{read:['super_admin','admin','clinic_admin'],write:[],delete:[]},
 Patient:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:RECEPTION,delete:RECEPTION},
 Doctor:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 Staff:{read:ADMIN,write:ADMIN,delete:ADMIN},
 Appointment:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:RECEPTION,delete:RECEPTION},
 Treatment:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 PatientTreatment:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:DOCTOR_WRITE,delete:DOCTOR_WRITE},
 Laboratory:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:RECEPTION,delete:ADMIN},
 LabCase:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:DOCTOR_WRITE,delete:RECEPTION},
 Shift:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 PatientFile:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:DOCTOR_WRITE,delete:RECEPTION},
 Notification:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 MessageLog:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 ReminderLog:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:ADMIN,delete:ADMIN},
 Expense:{read:ADMIN,write:ADMIN,delete:ADMIN}, Purchase:{read:ADMIN,write:ADMIN,delete:ADMIN}, DoctorPayout:{read:ADMIN,write:ADMIN,delete:ADMIN},
 Payment:{read:RECEPTION,write:RECEPTION,delete:RECEPTION}, Invoice:{read:RECEPTION,write:RECEPTION,delete:ADMIN},
 ConsentForm:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:DOCTOR_WRITE,delete:ADMIN},
 AuditLog:{read:['super_admin','admin','clinic_admin','receptionist','doctor'],write:[],delete:[]},
 ScheduledReport:{read:ADMIN,write:[],delete:[]}
};
function assertEntityPermission(role, entity, operation) {
 const allowed = ENTITY_PERMS[entity]?.[operation] || [];
 if (!allowed.includes(role)) throw Object.assign(new Error('Forbidden — insufficient permissions'), {status:403});
}

function makeSummary(action, entity, record) {
  const label=record?.full_name || record?.name || record?.patient_name || record?.invoice_number || record?.file_name || record?.case_type || '';
  return `${action} ${entity}${label ? ': '+label : ''}`;
}
async function recordAudit(ctx, clinicId, action, entity, recordId, summary, snapshot=null) {
  try { await ctx.db.from('AuditLog').insert({clinic_id:clinicId,created_by_id:ctx.user.id,action,entity_name:entity,record_id:recordId||null,record_snapshot:snapshot,user_id:ctx.user.id,user_name:ctx.user.user_metadata?.full_name||ctx.user.email||ctx.user.id,summary:summary||`${action} ${entity}`,restored:false}); } catch (e) { console.error('Audit log write failed',e?.message); }
}
function computeInvoiceTotals(record) {
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  const items=Array.isArray(record.items)?record.items:[];
  const snapshot=Array.isArray(record.payments_snapshot)?record.payments_snapshot:[];
  const result={}; const ensure=cur=>{if(!result[cur])result[cur]={due:0,paid:0,remaining:0};};
  if(record.type==='receipt') snapshot.forEach(p=>{const cur=p.currency||'USD';ensure(cur);result[cur].paid=round2(result[cur].paid+(Number(p.amount)||0));});
  else items.forEach(item=>{const cur=item.currency||'USD';ensure(cur);result[cur].due=round2(result[cur].due+(Number(item.total_price)||0));result[cur].paid=round2(result[cur].paid+(Number(item.paid_amount)||0));});
  Object.keys(result).forEach(cur=>{result[cur].remaining=round2(result[cur].due-result[cur].paid);}); return result;
}
async function applyPlanDiscount(ctx, clinicId, payload) {
  const {patient_id,discount_type,discount_value}=payload;
  if(!patient_id) throw Object.assign(new Error('patient_id is required'),{status:400});
  if(!['none','percentage','fixed'].includes(discount_type)) throw Object.assign(new Error('Invalid discount type'),{status:400,code:'invalid_discount_value'});
  const value=Number(discount_value);
  if(discount_type!=='none' && !Number.isFinite(value)) throw Object.assign(new Error('Enter a valid discount value'),{status:400,code:'invalid_discount_value'});
  if(discount_type==='percentage' && (value<=0||value>100)) throw Object.assign(new Error('Discount percentage must be between 0 and 100'),{status:400,code:'invalid_discount_percentage'});
  if(discount_type==='fixed' && value<0) throw Object.assign(new Error('Discount amount cannot be negative'),{status:400,code:'invalid_discount_value'});
  const {data,error}=await ctx.db.rpc('apply_plan_discount',{p_patient_id:patient_id,p_clinic_id:clinicId,p_discount_type:discount_type,p_discount_value:discount_type==='none'?0:value});
  if(error) { const msg=error.message||'Unable to apply discount'; throw Object.assign(new Error(msg),{status:400,code:'plan_discount_failed'}); }
  await recordAudit(ctx,clinicId,'update','Patient',patient_id,`apply plan discount: ${discount_type} ${discount_type==='none'?0:Math.round(value*100)/100} (${data.updated_treatments} treatments)`);
  return data;
}
async function restoreRecord(ctx, clinicId, entity, auditId) {
  if(!auditId) throw Object.assign(new Error('audit_id is required'),{status:400});
  const {data:audit,error}=await ctx.db.from('AuditLog').select('*').eq('id',auditId).eq('clinic_id',clinicId).single();
  if(error||!audit) throw Object.assign(new Error('Audit entry not found'),{status:404});
  if(audit.action!=='delete'||audit.restored) throw Object.assign(new Error('Not restorable'),{status:400});
  const entityName=audit.entity_name;
  if(!ENTITY_PERMS[entityName]||!CLINIC_ENTITIES.has(entityName)) throw Object.assign(new Error('Unknown entity'),{status:400});
  if(!audit.record_snapshot) throw Object.assign(new Error('No snapshot available'),{status:400});
  const clean={...audit.record_snapshot}; for(const key of ['id','created_date','updated_date','created_by_id']) delete clean[key]; clean.clinic_id=clinicId; clean.created_by_id=ctx.user.id;
  const {data:restored,error:createError}=await ctx.db.from(entityName).insert(clean).select('*').single(); if(createError) throw createError;
  if(entityName==='Patient') {
    for(const child of ['Appointment','Payment','PatientTreatment','PatientFile','ConsentForm','Invoice']) {
      const {data:rows}=await ctx.db.from(child).select('id').eq('clinic_id',clinicId).eq('patient_id',audit.record_id);
      for(const row of rows||[]) await ctx.db.from(child).update({patient_id:restored.id}).eq('id',row.id).eq('clinic_id',clinicId);
    }
  }
  await ctx.db.from('AuditLog').update({restored:true}).eq('id',auditId).eq('clinic_id',clinicId);
  await recordAudit(ctx,clinicId,'restore',entityName,restored.id,makeSummary('restore',entityName,restored));
  return {record:restored};
}
async function clinicScopedCrud(ctx, p) {
  const entity = String(p.entity || '');
  if (!CLINIC_ENTITIES.has(entity)) throw Object.assign(new Error('Entity is not available through clinic CRUD'), { status: 400 });
  let clinicId = ctx.clinicId;
  if (ctx.role === 'super_admin') clinicId = p.clinic_id || null;
  const q = ctx.db.from(entity);
  const action = p.action;
  if (entity === 'Clinic') {
    assertEntityPermission(ctx.role, entity, 'read');
    if (action === 'filter' || action === 'list') {
      let query = q.select('*');
      if (ctx.role !== 'super_admin' && ctx.role !== 'admin') query = query.eq('id', clinicId);
      if (p.sort) { const desc = p.sort.startsWith('-'); query = query.order(desc ? p.sort.slice(1) : p.sort, {ascending: !desc}); }
      const {data,error}=await query; if(error) throw error; const records = data || []; if(entity === 'Patient' && ctx.role === 'doctor') records.forEach(r=>{r.phone='';r.whatsapp_number='';}); if(entity === 'AuditLog' && !ADMIN.includes(ctx.role)) records.forEach(r=>{delete r.record_snapshot;}); return {records};
    }
    if (action === 'get') { const {data,error}=await q.select('*').eq('id',p.id).maybeSingle(); if(error) throw error; if (!data || (ctx.role !== 'super_admin' && ctx.role !== 'admin' && data.id !== clinicId)) throw Object.assign(new Error('Not found'),{status:404}); return {record:data}; }
    throw Object.assign(new Error('Clinic is read-only through generic CRUD'),{status:403});
  }
  if (!clinicId) throw Object.assign(new Error('A managed clinic must be selected'), { status: 400 });
  if (action === 'applyPlanDiscount') {
    if (!ENTITY_PERMS.Patient.write.includes(ctx.role) || !ENTITY_PERMS.PatientTreatment.write.includes(ctx.role)) throw Object.assign(new Error('Forbidden — insufficient permissions to change the plan discount'),{status:403,code:'forbidden'});
    return applyPlanDiscount(ctx,clinicId,p);
  }
  if (action === 'restore') { assertEntityPermission(ctx.role,entity,'write'); return restoreRecord(ctx,clinicId,entity,p.audit_id); }
  if (action === 'permanentDelete') {
    if(!ADMIN.includes(ctx.role)) throw Object.assign(new Error('Forbidden — admin access required'),{status:403});
    if(!p.audit_id) throw Object.assign(new Error('audit_id is required'),{status:400});
    const {data:audit,error}=await ctx.db.from('AuditLog').select('*').eq('id',p.audit_id).eq('clinic_id',clinicId).single();
    if(error||!audit) throw Object.assign(new Error('Audit entry not found'),{status:404});
    if(audit.action!=='delete'||audit.restored) throw Object.assign(new Error('Not eligible for permanent deletion'),{status:400});
    const {error:delError}=await ctx.db.from('AuditLog').delete().eq('id',p.audit_id).eq('clinic_id',clinicId); if(delError) throw delError; return {success:true};
  }
  if (action === 'filter' || action === 'list') {
    assertEntityPermission(ctx.role, entity, 'read');
    if (entity === 'Notification') p.filter = {...(p.filter||{}), user_id: ctx.user.id};
    let query = q.select('*').eq('clinic_id', clinicId);
    for (const [k,v] of Object.entries(p.filter || {})) { if (k === 'clinic_id') continue; query = v === null ? query.is(k,null) : Array.isArray(v) ? query.in(k,v) : query.eq(k,v); }
    if (p.sort) { const desc = p.sort.startsWith('-'); query = query.order(desc ? p.sort.slice(1) : p.sort, { ascending: !desc }); }
    if (p.limit) query = query.limit(Math.min(Number(p.limit),500));
    const {data,error}=await query; if(error) throw error; const records = data || []; if(entity === 'Patient' && ctx.role === 'doctor') records.forEach(r=>{r.phone='';r.whatsapp_number='';}); if(entity === 'AuditLog' && !ADMIN.includes(ctx.role)) records.forEach(r=>{delete r.record_snapshot;}); return {records};
  }
  if (action === 'get') { assertEntityPermission(ctx.role, entity, 'read'); let query=q.select('*').eq('id',p.id).eq('clinic_id',clinicId); if(entity==='Notification') query=query.eq('user_id',ctx.user.id); const {data,error}=await query.single(); if(error) throw error; if(entity==='Patient'&&ctx.role==='doctor'){data.phone='';data.whatsapp_number='';} if(entity==='AuditLog'&&!ADMIN.includes(ctx.role)) delete data.record_snapshot; return {record:data}; }
  if (action === 'create' || action === 'bulkCreate') {
    assertEntityPermission(ctx.role, entity, 'write');
    const serverOwned = {Payment:['doctor_commission_percentage','doctor_commission_amount','is_prosthesis','prosthesis_cost','net_amount','doctor_name'],Invoice:['totals']};
    const inputRows = action === 'bulkCreate' ? (Array.isArray(p.record) ? p.record : []) : [p.record];
    const rows = inputRows.map(r => { const clean={...(r||{})}; for(const field of (serverOwned[entity]||[])) delete clean[field]; delete clean.id; delete clean.created_date; delete clean.updated_date; delete clean.created_by_id; clean.clinic_id=clinicId; clean.created_by_id=ctx.user.id; if(entity==='Invoice') clean.totals=computeInvoiceTotals(clean); if(entity==='Appointment'&&clean.start_time&&clean.end_time&&clean.end_time<=clean.start_time) throw Object.assign(new Error('End time must be after start time'),{status:400}); return clean; });
    const {data,error}=await q.insert(rows).select('*'); if(error) throw error;
    if (action === 'create') await recordAudit(ctx,clinicId,'create',entity,data?.[0]?.id,makeSummary('create',entity,data?.[0]));
    return action === 'bulkCreate' ? {records:data} : {record:data?.[0]};
  }
  if (action === 'update') {
    if (entity === 'Notification' && Object.keys(p.patch || {}).every(k => k === 'read')) {
      const {data: owned,error: lookupError}=await q.select('id').eq('id',p.id).eq('clinic_id',clinicId).eq('user_id',ctx.user.id).maybeSingle();
      if (lookupError || !owned) throw Object.assign(new Error('Not found'),{status:404});
    } else if (entity === 'Patient' && ctx.role === 'doctor') { const keys = Object.keys(p.patch || {}).filter(k => !['id','created_date','updated_date','created_by_id','clinic_id'].includes(k)); if (!keys.length || keys.some(k => !['medical_info','dental_history'].includes(k))) throw Object.assign(new Error('Doctors may only edit medical information'), {status:403}); } else assertEntityPermission(ctx.role, entity, 'write');
    const safePatch = {...(p.patch||{})}; delete safePatch.clinic_id; delete safePatch.id; delete safePatch.created_date; delete safePatch.updated_date; delete safePatch.created_by_id;
    const serverOwnedPatch={Payment:['doctor_commission_percentage','doctor_commission_amount','is_prosthesis','prosthesis_cost','net_amount','doctor_name'],Invoice:['totals']}; for(const field of (serverOwnedPatch[entity]||[])) delete safePatch[field];
    const {data:existing,error:existingError}=await q.select('*').eq('id',p.id).eq('clinic_id',clinicId).single(); if(existingError) throw Object.assign(new Error('Not found'),{status:404});
    if(entity==='Invoice' && (safePatch.items!==undefined || safePatch.payments_snapshot!==undefined || safePatch.type!==undefined)) safePatch.totals=computeInvoiceTotals({...existing,...safePatch});
    safePatch.updated_date=new Date().toISOString();
    const {data,error}=await q.update(safePatch).eq('id',p.id).eq('clinic_id',clinicId).select('*').single(); if(error) throw error;
    if (entity !== 'Notification') await recordAudit(ctx,clinicId,'update',entity,p.id,makeSummary('update',entity,existing));
    return {record:data}; }
  if (action === 'delete') { assertEntityPermission(ctx.role, entity, 'delete'); if(!p.id) throw Object.assign(new Error('id is required'),{status:400}); if (entity === 'AuditLog') throw Object.assign(new Error('Audit logs cannot be deleted through this endpoint'), {status:403}); const {data:before}=await q.select('*').eq('id',p.id).eq('clinic_id',clinicId).maybeSingle(); if(!before) throw Object.assign(new Error('Not found'),{status:404}); const {error}=await q.delete().eq('id',p.id).eq('clinic_id',clinicId); if(error) throw error; await recordAudit(ctx,clinicId,'delete',entity,p.id,makeSummary('delete',entity,before),before); return {success:true}; }
  throw Object.assign(new Error(`Unsupported clinicScopedCrud action: ${action}`), {status:400});
}
async function signedPatientFileUrl(ctx, payload) {
  let fileQuery=ctx.db.from('PatientFile').select('id,clinic_id,file_uri').eq('id',payload.file_id); if(ctx.role!=='super_admin') fileQuery=fileQuery.eq('clinic_id',ctx.clinicId);
  const {data:file,error}=await fileQuery.single();
  if(error || !file?.file_uri) throw Object.assign(new Error('File not found'),{status:404});
  const prefix='storage://patient-files/';
  if(!file.file_uri.startsWith(prefix)) throw Object.assign(new Error('Invalid private file reference'),{status:400});
  const path=file.file_uri.slice(prefix.length);
  if(!path.startsWith(`${file.clinic_id}/`)) throw Object.assign(new Error('Forbidden'),{status:403});
  const {data,error:signError}=await ctx.db.storage.from('patient-files').createSignedUrl(path,300);
  if(signError) throw signError;
  return {signed_url:data.signedUrl};
}
async function fetchAllRows(ctx,entity,filters={},sort='-created_date') {
  const rows=[]; let offset=0; const batchSize=1000;
  while(true){
    let query=ctx.db.from(entity).select('*').range(offset,offset+batchSize-1);
    for(const [key,value] of Object.entries(filters||{})){
      if(key==='$or') continue;
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        for(const [op,v] of Object.entries(value)){if(op==='$gte')query=query.gte(key,v);else if(op==='$lte')query=query.lte(key,v);else if(op==='$gt')query=query.gt(key,v);else if(op==='$lt')query=query.lt(key,v);else if(op==='$in')query=query.in(key,v);else if(op==='$ne')query=query.neq(key,v);}
      } else query=value===null?query.is(key,null):Array.isArray(value)?query.in(key,value):query.eq(key,value);
    }
    if(sort){const desc=sort.startsWith('-');query=query.order(desc?sort.slice(1):sort,{ascending:!desc});}
    const {data,error}=await query;if(error)throw error;const batch=data||[];rows.push(...batch);if(batch.length<batchSize)break;offset+=batchSize;if(offset>1000000)throw new Error('Result set exceeds safe maximum; narrow the query.');
  }
  return rows;
}
function sumByCurrency(records,amountField,currencyField='currency') { const out={}; for(const r of records||[]){const cur=r[currencyField]||'USD';out[cur]=Math.round(((out[cur]||0)+(Number(r[amountField])||0))*100)/100;}return out; }
const roundMoney=n=>Math.round((Number(n)||0)*100)/100;
function dateOnly(d){return d.toISOString().split('T')[0];}
function calcProsthesisNet(paymentAmount,cumulativePaidBefore,cost) {
  const amount=Number(paymentAmount)||0,before=Number(cumulativePaidBefore)||0,c=Number(cost)||0;
  if(c<=0)return amount;if(before>=c)return amount;const after=before+amount;if(after<=c)return 0;return roundMoney(after-c);
}
async function recalcTreatmentPaid(ctx,patientTreatmentId,clinicId) {
  const {data:treatment,error}=await ctx.db.from('PatientTreatment').select('*').eq('id',patientTreatmentId).eq('clinic_id',clinicId).maybeSingle();if(error||!treatment)return;
  const payments=await fetchAllRows(ctx,'Payment',{patient_treatment_id:patientTreatmentId,clinic_id:clinicId},'-created_date');
  const same=payments.filter(p=>(p.currency||'USD')===(treatment.currency||'USD'));
  const total=roundMoney(same.reduce((sum,p)=>sum+(Number(p.amount)||0),0));
  await ctx.db.from('PatientTreatment').update({paid_amount:total,updated_date:new Date().toISOString()}).eq('id',patientTreatmentId).eq('clinic_id',clinicId);
}
async function saveDoctorCompensation(ctx,p) {
  if(!['super_admin','clinic_admin'].includes(ctx.role)) throw Object.assign(new Error('Forbidden — only clinic administrators can manage doctor compensation'),{status:403});
  let clinicId=ctx.clinicId;if(ctx.isOwner)clinicId=p.clinic_id||null;if(!clinicId)throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  if(!p.doctor_id)throw Object.assign(new Error('Doctor ID is required'),{status:400});
  const {data:doctor,error}=await ctx.db.from('Doctor').select('*').eq('id',p.doctor_id).eq('clinic_id',clinicId).single();if(error||!doctor)throw Object.assign(new Error('Doctor not found'),{status:404});
  const validatePct=v=>{const n=Number(v)||0;return n<0||n>100?null:n;};
  const pctDoctor=validatePct(p.commission_percentage_doctor),pctClinic=validatePct(p.commission_percentage_clinic),pctLegacy=validatePct(p.commission_percentage);
  if(pctDoctor===null||pctClinic===null||pctLegacy===null)throw Object.assign(new Error('Commission percentage must be between 0 and 100'),{status:400});
  const salary=Number(p.monthly_salary)||0;const currency=['USD','SYP','TRY','EUR'].includes(p.salary_currency)?p.salary_currency:'USD';
  const patch={monthly_salary:salary,salary_currency:currency,updated_date:new Date().toISOString()};
  if(p.commission_percentage_doctor!==undefined)patch.commission_percentage_doctor=pctDoctor;
  if(p.commission_percentage_clinic!==undefined)patch.commission_percentage_clinic=pctClinic;
  if(p.commission_percentage!==undefined)patch.commission_percentage=pctLegacy;
  const {data:updated,error:updateError}=await ctx.db.from('Doctor').update(patch).eq('id',p.doctor_id).eq('clinic_id',clinicId).select('*').single();if(updateError)throw updateError;
  await recordAudit(ctx,clinicId,'update','Doctor',p.doctor_id,makeSummary('update','Doctor',doctor));
  return {success:true,doctor:updated};
}
async function savePayment(ctx,p) {
  if(!['super_admin','clinic_admin','receptionist'].includes(ctx.role)) throw Object.assign(new Error('Forbidden — only clinic administrators and receptionists can manage payments'),{status:403});
  let clinicId=ctx.clinicId;if(ctx.isOwner)clinicId=p.clinic_id||null;if(!clinicId)throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  const paymentId=p.payment_id||null;
  if(p.action==='delete'){
    if(!paymentId)throw Object.assign(new Error('Payment ID is required'),{status:400});
    const {data:existing,error}=await ctx.db.from('Payment').select('*').eq('id',paymentId).eq('clinic_id',clinicId).single();if(error||!existing)throw Object.assign(new Error('Payment not found'),{status:404});
    await recordAudit(ctx,clinicId,'delete','Payment',paymentId,makeSummary('delete','Payment',existing),existing);
    const {error:delError}=await ctx.db.from('Payment').delete().eq('id',paymentId).eq('clinic_id',clinicId);if(delError)throw delError;
    if(existing.patient_treatment_id)await recalcTreatmentPaid(ctx,existing.patient_treatment_id,clinicId);
    return {success:true};
  }
  const patientId=p.patient_id,doctorId=p.doctor_id,amount=Number(p.amount);
  if(!patientId)throw Object.assign(new Error('Patient is required'),{status:400});
  if(!doctorId)throw Object.assign(new Error('Doctor is required'),{status:400});
  if(!Number.isFinite(amount)||amount<=0)throw Object.assign(new Error('Payment amount must be a valid number greater than zero'),{status:400});
  const {data:doctor,error:doctorError}=await ctx.db.from('Doctor').select('*').eq('id',doctorId).eq('clinic_id',clinicId).single();if(doctorError||!doctor)throw Object.assign(new Error('Doctor not found or belongs to another clinic'),{status:404});
  const {data:patient,error:patientError}=await ctx.db.from('Patient').select('*').eq('id',patientId).eq('clinic_id',clinicId).single();if(patientError||!patient)throw Object.assign(new Error('Patient not found or belongs to another clinic'),{status:404});
  let treatment=null;
  if(p.patient_treatment_id){const {data:pt,error}=await ctx.db.from('PatientTreatment').select('*').eq('id',p.patient_treatment_id).eq('clinic_id',clinicId).eq('patient_id',patientId).single();if(error||!pt)throw Object.assign(new Error('Selected treatment does not belong to your clinic or patient'),{status:403});treatment=pt;}
  const source=patient.patient_source||'clinic';let doctorPct=0;
  if(source==='doctor')doctorPct=Number(doctor.commission_percentage_doctor)||Number(doctor.commission_percentage)||0;
  else if(source==='clinic')doctorPct=Number(doctor.commission_percentage_clinic)||Number(doctor.commission_percentage)||0;
  else doctorPct=Number(doctor.commission_percentage)||0;
  if(doctorPct<0||doctorPct>100)throw Object.assign(new Error('Doctor commission percentage must be between 0 and 100'),{status:400});
  const currency=p.currency||'USD';let isProsthesis=false,prosthesisCost=0,netAmount=amount;
  if(p.patient_treatment_id){
    try{const labs=await fetchAllRows(ctx,'LabCase',{patient_treatment_id:p.patient_treatment_id,clinic_id:clinicId},'-created_date');const lab=labs.find(x=>(x.currency||'USD')===currency&&(Number(x.cost)||0)>0);if(lab){isProsthesis=true;prosthesisCost=roundMoney(lab.cost);const prior=await fetchAllRows(ctx,'Payment',{patient_treatment_id:p.patient_treatment_id,clinic_id:clinicId},'-created_date');const before=prior.filter(x=>(x.currency||'USD')===currency&&x.id!==paymentId).reduce((sum,x)=>sum+(Number(x.amount)||0),0);netAmount=calcProsthesisNet(amount,before,prosthesisCost);}}catch(e){console.error('[savePayment] Lab-cost lookup failed; using standard commission base',e?.message);}
  }
  const payload={patient_id:patientId,doctor_id:doctorId,doctor_name:doctor.name,amount:roundMoney(amount),currency,method:p.method||'cash',payment_date:p.payment_date||dateOnly(new Date()),notes:p.notes||'',clinic_id:clinicId,is_prosthesis:isProsthesis,prosthesis_cost:prosthesisCost,net_amount:netAmount};
  if(p.patient_treatment_id)payload.patient_treatment_id=p.patient_treatment_id;
  if(paymentId){
    const {data:existing,error}=await ctx.db.from('Payment').select('*').eq('id',paymentId).eq('clinic_id',clinicId).single();if(error||!existing)throw Object.assign(new Error('Payment not found'),{status:404});
    const finalPct=existing.doctor_id===doctorId&&existing.doctor_commission_percentage!=null?(Number(existing.doctor_commission_percentage)||0):doctorPct;
    payload.doctor_commission_percentage=finalPct;payload.doctor_commission_amount=roundMoney(netAmount*finalPct/100);
    await recordAudit(ctx,clinicId,'update','Payment',paymentId,makeSummary('update','Payment',existing));
    const {data:updated,error:updateError}=await ctx.db.from('Payment').update({...payload,updated_date:new Date().toISOString()}).eq('id',paymentId).eq('clinic_id',clinicId).select('*').single();if(updateError)throw updateError;
    if(p.patient_treatment_id)await recalcTreatmentPaid(ctx,p.patient_treatment_id,clinicId);
    return {success:true,payment:updated};
  }
  payload.doctor_commission_percentage=doctorPct;payload.doctor_commission_amount=roundMoney(netAmount*doctorPct/100);
  payload.created_by_id=ctx.user.id;const {data:created,error:createError}=await ctx.db.from('Payment').insert(payload).select('*').single();if(createError)throw createError;
  await recordAudit(ctx,clinicId,'create','Payment',created.id,makeSummary('create','Payment',created));
  if(p.patient_treatment_id)await recalcTreatmentPaid(ctx,p.patient_treatment_id,clinicId);
  try{
    const {data:invoices}=await ctx.db.from('Invoice').select('payment_ids').eq('clinic_id',clinicId).eq('patient_id',patientId).order('created_date',{ascending:false}).limit(500);
    const already=(invoices||[]).some(inv=>Array.isArray(inv.payment_ids)&&inv.payment_ids.includes(created.id));
    if(!already){const treatmentName=treatment?.treatment_name||'';const today=payload.payment_date;const invoice={clinic_id:clinicId,created_by_id:ctx.user.id,patient_id:patientId,patient_name:patient.full_name||'',invoice_number:`REC-${Date.now()}-${created.id.slice(-6)}`,invoice_date:today,type:'receipt',doctor_id:doctorId,doctor_name:doctor.name,items:[],payment_ids:[created.id],payments_snapshot:[{payment_id:created.id,amount:payload.amount,currency,method:payload.method,payment_date:today,treatment_name:treatmentName,notes:payload.notes}],totals:{[currency]:{due:0,paid:payload.amount,remaining:0}},notes:'',status:'active'};await ctx.db.from('Invoice').insert(invoice);}
  }catch(e){console.error('[savePayment] Auto receipt invoice creation failed',e?.message);}
  return {success:true,payment:created};
}
async function getDashboardStats(ctx,p) {
  let clinicId=ctx.clinicId;if(ctx.role==='super_admin')clinicId=p.clinic_id||null;if(!clinicId)throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  const isFinancialAdmin=ADMIN.includes(ctx.role);const today=dateOnly(new Date());const six=new Date();six.setMonth(six.getMonth()-6);const sixStart=dateOnly(six);
  const [patients,todayAppts,upcomingAppts,recentPayments,doctors,labCases,staff]=await Promise.all([
    fetchAllRows(ctx,'Patient',{clinic_id:clinicId},'-created_date'),
    fetchAllRows(ctx,'Appointment',{clinic_id:clinicId,date:today},'start_time'),
    fetchAllRows(ctx,'Appointment',{clinic_id:clinicId,date:{$gte:today}},'date'),
    isFinancialAdmin?fetchAllRows(ctx,'Payment',{clinic_id:clinicId,payment_date:{$gte:sixStart}},'-payment_date'):Promise.resolve([]),
    fetchAllRows(ctx,'Doctor',{clinic_id:clinicId},'name'),
    fetchAllRows(ctx,'LabCase',{clinic_id:clinicId},'-created_date'),
    isFinancialAdmin?fetchAllRows(ctx,'Staff',{clinic_id:clinicId},'full_name'):Promise.resolve([])
  ]);
  const revenueByCurrency=sumByCurrency(recentPayments,'amount');const now=new Date();const monthStart=dateOnly(new Date(now.getFullYear(),now.getMonth(),1));const monthEnd=dateOnly(new Date(now.getFullYear(),now.getMonth()+1,0));
  const monthlyIncomeByCurrency=isFinancialAdmin?sumByCurrency(recentPayments.filter(x=>x.payment_date>=monthStart&&x.payment_date<=monthEnd),'amount'):{};
  const upcomingCount=upcomingAppts.filter(a=>a.status!=='cancelled').length;const activeLabCases=labCases.filter(c=>['sent','in_progress'].includes(c.status)).length;
  const newPatientsThisMonth=patients.filter(pat=>{const d=new Date(pat.created_date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const revenueData=[],patientGrowth=[];
  for(let i=5;i>=0;i--){const m=new Date(now.getFullYear(),now.getMonth()-i,1);const start=dateOnly(new Date(m.getFullYear(),m.getMonth(),1));const end=dateOnly(new Date(m.getFullYear(),m.getMonth()+1,0));const monthPayments=recentPayments.filter(pmt=>pmt.payment_date>=start&&pmt.payment_date<=end);revenueData.push({month:m.toLocaleString('en',{month:'short'}),...sumByCurrency(monthPayments,'amount')});const endDate=new Date(m.getFullYear(),m.getMonth()+1,0,23,59,59);patientGrowth.push({month:m.toLocaleString('en',{month:'short'}),patients:patients.filter(pat=>new Date(pat.created_date)<=endDate).length});}
  const statusCounts={};upcomingAppts.forEach(a=>{statusCounts[a.status]=(statusCounts[a.status]||0)+1;});
  return {canViewFinancials:isFinancialAdmin,metrics:{totalPatients:patients.length,newPatientsThisMonth,todaysAppointments:todayAppts.length,todaysCompleted:todayAppts.filter(a=>a.status==='completed').length,upcomingAppointments:upcomingCount,revenueByCurrency:isFinancialAdmin?revenueByCurrency:{},monthlyIncomeByCurrency:isFinancialAdmin?monthlyIncomeByCurrency:{},paymentCount:isFinancialAdmin?recentPayments.length:0,activeDoctors:doctors.length,totalStaff:isFinancialAdmin?staff.length:0,activeLabCases},revenueData:isFinancialAdmin?revenueData:[],patientGrowth,statusDistribution:Object.entries(statusCounts).map(([name,value])=>({name,value})),recentPatients:patients.slice(0,5).map(pat=>({id:pat.id,full_name:pat.full_name,phone:ctx.role==='doctor'?'':pat.phone,created_date:pat.created_date})),recentPayments:isFinancialAdmin?recentPayments.slice(0,5).map(pmt=>({id:pmt.id,amount:pmt.amount,currency:pmt.currency||'USD',method:pmt.method,payment_date:pmt.payment_date,created_date:pmt.created_date})):[],todayAppointments:todayAppts.map(a=>({id:a.id,patient_name:a.patient_name,doctor_name:a.doctor_name,start_time:a.start_time,status:a.status,doctor_color:a.doctor_color})).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''))};
}
async function getDoctorCommissionSummary(ctx,p) {
  let clinicId=ctx.clinicId;if(ctx.isOwner)clinicId=p.clinic_id||null;if(!clinicId)throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  if(!['super_admin','admin','clinic_admin','doctor'].includes(ctx.role))throw Object.assign(new Error('Forbidden — only clinic administrators and doctors can view commission data'),{status:403});
  const [doctors,payments,payouts,patients]=await Promise.all([
    fetchAllRows(ctx,'Doctor',{clinic_id:clinicId},'name'),fetchAllRows(ctx,'Payment',{clinic_id:clinicId},'-payment_date'),fetchAllRows(ctx,'DoctorPayout',{clinic_id:clinicId},'-payment_date'),fetchAllRows(ctx,'Patient',{clinic_id:clinicId},'full_name')
  ]);
  let visible=doctors;if(ctx.role==='doctor'){visible=doctors.filter(d=>d.user_id===ctx.user.id);if(!visible.length)return {success:true,summary:[]};}
  const patientMap=Object.fromEntries(patients.map(pt=>[pt.id,pt]));const from=p.date_from||null,to=p.date_to||null;const inRange=d=>(!from||!d||d>=from)&&(!to||!d||d<=to);const ranged=payments.filter(x=>inRange(x.payment_date));
  const summary=visible.map(doc=>{const docPayments=ranged.filter(x=>x.doctor_id===doc.id);const revenue=sumByCurrency(docPayments,'amount');const commission=sumByCurrency(docPayments,'doctor_commission_amount');const docPayouts=payouts.filter(x=>x.doctor_id===doc.id);const paid=sumByCurrency(docPayouts,'amount');const remaining={},overpaid={};for(const cur of new Set([...Object.keys(commission),...Object.keys(paid)])){const raw=roundMoney((commission[cur]||0)-(paid[cur]||0));remaining[cur]=raw>0?raw:0;if(raw<0)overpaid[cur]=roundMoney(Math.abs(raw));}
    return {doctor_id:doc.id,doctor_name:doc.name,commission_percentage:Number(doc.commission_percentage)||0,commission_percentage_doctor:Number(doc.commission_percentage_doctor)||0,commission_percentage_clinic:Number(doc.commission_percentage_clinic)||0,payments_count:docPayments.length,total_revenue:revenue,total_commission:commission,paid_amount:paid,remaining,overpaid,payments:docPayments.map(x=>({payment_id:x.id,patient_id:x.patient_id,patient_name:patientMap[x.patient_id]?.full_name||'',treatment_name:'',amount:x.amount,currency:x.currency||'USD',commission_percentage:x.doctor_commission_percentage||0,commission_amount:x.doctor_commission_amount||0,payment_date:x.payment_date,method:x.method||'cash'}))};
  });return {success:true,summary};
}
async function getMonthlyExpenses(ctx,p) {
  let clinicId=ctx.clinicId;if(ctx.isOwner)clinicId=p.clinic_id||null;if(!clinicId)throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  if(!['super_admin','admin','clinic_admin'].includes(ctx.role))throw Object.assign(new Error('Forbidden — only clinic administrators can view monthly expenses'),{status:403});
  const now=new Date();const month=p.month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const parts=month.split('-').map(Number);const year=parts[0],mon=parts[1];if(!year||!mon||mon<1||mon>12)throw Object.assign(new Error('Invalid month format. Expected YYYY-MM'),{status:400});
  const start=dateOnly(new Date(year,mon-1,1)),end=dateOnly(new Date(year,mon,0));
  const [doctors,staff,paymentsRaw,expensesRaw,purchasesRaw]=await Promise.all([
    fetchAllRows(ctx,'Doctor',{clinic_id:clinicId},'name'),fetchAllRows(ctx,'Staff',{clinic_id:clinicId},'full_name'),fetchAllRows(ctx,'Payment',{clinic_id:clinicId,payment_date:{$gte:start}},'-payment_date'),fetchAllRows(ctx,'Expense',{clinic_id:clinicId,expense_date:{$gte:start}},'-expense_date'),fetchAllRows(ctx,'Purchase',{clinic_id:clinicId,purchase_date:{$gte:start}},'-purchase_date')
  ]);
  const payments=paymentsRaw.filter(x=>x.payment_date<=end),expenses=expensesRaw.filter(x=>x.expense_date<=end),purchases=purchasesRaw.filter(x=>x.purchase_date<=end);
  const commissionByDoctor={};for(const pay of payments){if(!pay.doctor_id)continue;const cur=pay.currency||'USD';commissionByDoctor[pay.doctor_id]??={};commissionByDoctor[pay.doctor_id][cur]=roundMoney((commissionByDoctor[pay.doctor_id][cur]||0)+(Number(pay.doctor_commission_amount)||0));}
  const doctorList=doctors.map(d=>({id:d.id,name:d.name,specialty:d.specialty||'',salary:d.monthly_salary||0,salary_currency:d.salary_currency||'USD',commission_percentage:d.commission_percentage||0,commission_earned:commissionByDoctor[d.id]||{}}));
  const staffList=staff.filter(x=>!x.status||x.status==='active').map(x=>({id:x.id,name:x.full_name,position:x.position||'staff',salary:x.salary||0,salary_currency:x.salary_currency||'USD'}));
  const mapExpense=x=>({id:x.id,name:x.name,amount:x.amount||0,currency:x.currency||'USD',category:x.category||'other',expense_date:x.expense_date,notes:x.notes||''});
  const prosthesis=expenses.filter(x=>(x.category||'other')==='prosthesis_lab').map(x=>({...mapExpense(x),category:'prosthesis_lab'}));const other=expenses.filter(x=>(x.category||'other')!=='prosthesis_lab').map(mapExpense);
  const purchaseList=purchases.map(x=>({id:x.id,name:x.name,amount:x.amount||0,currency:x.currency||'USD',category:x.category||'other',supplier:x.supplier||'',purchase_date:x.purchase_date,notes:x.notes||''}));
  const add=(a,b)=>{const out={...a};for(const [cur,val] of Object.entries(b))out[cur]=roundMoney((out[cur]||0)+val);return out;};
  const doctorSalaries=sumByCurrency(doctorList,'salary','salary_currency'),doctorCommissions={};for(const d of doctorList)for(const [cur,val] of Object.entries(d.commission_earned))doctorCommissions[cur]=roundMoney((doctorCommissions[cur]||0)+val);
  const staffSalaries=sumByCurrency(staffList,'salary','salary_currency'),otherTotals=sumByCurrency(other,'amount'),prosthesisTotals=sumByCurrency(prosthesis,'amount'),purchaseTotals=sumByCurrency(purchaseList,'amount');
  const grand=add(add(add(add(add(doctorSalaries,doctorCommissions),staffSalaries),otherTotals),prosthesisTotals),purchaseTotals);
  return {month,monthLabel:new Date(year,mon-1,1).toLocaleString('en',{month:'long',year:'numeric'}),doctors:doctorList,staff:staffList,expenses:other,prosthesis_lab:prosthesis,purchases:purchaseList,totals:{staff_salaries:staffSalaries,doctor_salaries:doctorSalaries,doctor_commissions:doctorCommissions,other_expenses:otherTotals,prosthesis_lab_costs:prosthesisTotals,purchases:purchaseTotals,grand_total:grand}};
}
async function getDoctorDashboard(ctx) {
  if(ctx.role!=='doctor')throw Object.assign(new Error('Doctor access required'),{status:403});
  const clinicId=ctx.clinicId;const {data:linked,error:linkError}=await ctx.db.from('Doctor').select('*').eq('clinic_id',clinicId).eq('user_id',ctx.user.id).limit(1).maybeSingle();if(linkError)throw linkError;
  let doctor=linked;
  if(!doctor){const {data:created,error}=await ctx.db.from('Doctor').insert({clinic_id:clinicId,created_by_id:ctx.user.id,user_id:ctx.user.id,name:ctx.user.user_metadata?.full_name||ctx.user.email||'Doctor',commission_percentage:0,commission_percentage_doctor:0,commission_percentage_clinic:0,monthly_salary:0,salary_currency:'USD'}).select('*').single();if(error)throw error;doctor=created;}
  const today=dateOnly(new Date());
  const [appointments,patientTreatments,payments,payouts,labCases,assignedPatients,referringPatients]=await Promise.all([
    fetchAllRows(ctx,'Appointment',{clinic_id:clinicId,doctor_id:doctor.id},'-date'),
    fetchAllRows(ctx,'PatientTreatment',{clinic_id:clinicId,doctor_id:doctor.id},'-created_date'),
    fetchAllRows(ctx,'Payment',{clinic_id:clinicId,doctor_id:doctor.id},'-payment_date'),
    fetchAllRows(ctx,'DoctorPayout',{clinic_id:clinicId,doctor_id:doctor.id},'-payment_date'),
    fetchAllRows(ctx,'LabCase',{clinic_id:clinicId,doctor_id:doctor.id},'-due_date'),
    fetchAllRows(ctx,'Patient',{clinic_id:clinicId,assigned_doctor_id:doctor.id},'-created_date'),
    fetchAllRows(ctx,'Patient',{clinic_id:clinicId,referring_doctor_id:doctor.id},'-created_date')
  ]);
  const patients=[...new Map([...assignedPatients,...referringPatients].map(x=>[x.id,x])).values()];const patientIds=new Set(patients.map(x=>x.id));const extraIds=[...new Set([...appointments.map(x=>x.patient_id),...patientTreatments.map(x=>x.patient_id),...labCases.map(x=>x.patient_id)].filter(Boolean))].filter(x=>!patientIds.has(x));
  let extraPatients=[];if(extraIds.length)extraPatients=await fetchAllRows(ctx,'Patient',{clinic_id:clinicId,id:{$in:extraIds}},'full_name');
  const patientNameById=Object.fromEntries([...patients,...extraPatients].map(x=>[x.id,x.full_name]));
  const todaysAppointments=appointments.filter(a=>a.date===today).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).map(a=>({id:a.id,patient_name:a.patient_name||patientNameById[a.patient_id]||'Patient',start_time:a.start_time,end_time:a.end_time,status:a.status,treatment_name:a.treatment_name||'',treatment_room:a.treatment_room}));
  const upcomingAppointments=appointments.filter(a=>a.date>today&&a.status!=='cancelled').sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time)).slice(0,10).map(a=>({id:a.id,date:a.date,start_time:a.start_time,status:a.status,patient_name:a.patient_name||patientNameById[a.patient_id]||'Patient',treatment_name:a.treatment_name||''}));
  const commission=sumByCurrency(payments,'doctor_commission_amount');const paid=sumByCurrency(payouts,'amount');const remaining={};for(const cur of new Set([...Object.keys(commission),...Object.keys(paid)]))remaining[cur]=roundMoney((commission[cur]||0)-(paid[cur]||0));
  const activeLab=labCases.filter(c=>['sent','in_progress','ready'].includes(c.status)).slice(0,10).map(c=>({id:c.id,case_type:c.case_type,status:c.status,due_date:c.due_date,lab_name:c.lab_name||'',cost:c.cost||0,currency:c.currency||'USD',patient_name:c.patient_name||patientNameById[c.patient_id]||'Patient'}));
  return {linked:true,doctor:{id:doctor.id,name:doctor.name,specialty:doctor.specialty||'',commission_percentage:doctor.commission_percentage||0},metrics:{totalPatients:patients.length,todaysAppointmentCount:todaysAppointments.length,todaysCompleted:todaysAppointments.filter(a=>a.status==='completed').length,upcomingCount:appointments.filter(a=>a.date>today&&a.status!=='cancelled').length,totalAppointments:appointments.length,activeTreatments:patientTreatments.filter(t=>t.status==='in_progress').length,activeLabCaseCount:activeLab.length},financials:{commission,paid,remaining},todaysAppointments,upcomingAppointments,activeLabCases:activeLab,treatmentPlans:patientTreatments.slice(0,15).map(t=>({id:t.id,treatment_name:t.treatment_name,status:t.status,patient_name:patientNameById[t.patient_id]||'Patient',price:t.price||0,currency:t.currency||'USD',treatment_date:t.treatment_date})),recentPatients:patients.slice(0,8).map(pat=>({id:pat.id,full_name:pat.full_name})),payouts:payouts.slice(0,10).map(p=>({id:p.id,amount:p.amount,currency:p.currency||'USD',payment_date:p.payment_date,notes:p.notes||''}))};
}
async function getPaginatedRecords(ctx,p) {
  const entityMap={patients:'Patient',appointments:'Appointment',payments:'Payment',lab_cases:'LabCase',patient_treatments:'PatientTreatment',staff:'Staff',doctors:'Doctor',laboratories:'Laboratory',purchases:'Purchase',audit_logs:'AuditLog'};
  const entity=entityMap[p.entity]; if(!entity) throw Object.assign(new Error('Invalid entity type'),{status:400});
  assertEntityPermission(ctx.role,entity,'read');
  if(['payments','staff','purchases'].includes(p.entity) && !ADMIN.includes(ctx.role)) throw Object.assign(new Error('Forbidden — admin access required for this data'),{status:403});
  let clinicId=ctx.clinicId; if(ctx.role==='super_admin') clinicId=p.clinic_id||null;
  if(!clinicId) throw Object.assign(new Error('A managed clinic must be selected'),{status:400});
  const page=Math.max(0,Number(p.page)||0), pageSize=Math.min(Math.max(1,Number(p.page_size)||20),100), from=page*pageSize;
  let query=ctx.db.from(entity).select('*',{count:'exact'}).eq('clinic_id',clinicId);
  const filters={...(p.filters||{})}; delete filters.clinic_id;
  if(entity==='Notification') filters.user_id=ctx.user.id;
  for(const [key,value] of Object.entries(filters)) {
    if(value && typeof value==='object' && !Array.isArray(value)) {
      for(const [operator,operand] of Object.entries(value)) {
        if(operator==='$gte') query=query.gte(key,operand);
        else if(operator==='$lte') query=query.lte(key,operand);
        else if(operator==='$gt') query=query.gt(key,operand);
        else if(operator==='$lt') query=query.lt(key,operand);
        else if(operator==='$ne') query=query.neq(key,operand);
        else if(operator==='$in' && Array.isArray(operand)) query=query.in(key,operand);
        else throw Object.assign(new Error(`Unsupported filter operator: ${operator}`),{status:400});
      }
    } else query=value===null?query.is(key,null):Array.isArray(value)?query.in(key,value):query.eq(key,value);
  }
  if(p.search && String(p.search).trim()) {
    const fields={Patient:(ctx.role==='doctor'?['full_name']:['full_name','phone']),Appointment:['patient_name','doctor_name','treatment_name'],Payment:['notes'],LabCase:['case_type','patient_name','lab_name','description'],PatientTreatment:['treatment_name','description'],Staff:['full_name','phone','email','employee_id'],Doctor:['name','specialty','phone'],Laboratory:['name','contact_person','phone','email'],Purchase:['name','supplier','category','notes'],AuditLog:['entity_name','summary','user_name','action']}[entity]||[];
    const term=String(p.search).trim().replace(/[\\%,._*()]/g,' ');
    if(fields.length) query=query.or(fields.map(field=>`${field}.ilike.%${term}%`).join(','));
  }
  const sort=String(p.sort||'-created_date'); const desc=sort.startsWith('-'); const sortField=desc?sort.slice(1):sort; if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(sortField)) throw Object.assign(new Error('Invalid sort field'),{status:400}); query=query.order(sortField,{ascending:!desc}).range(from,from+pageSize-1);
  const {data,error,count}=await query; if(error) throw error;
  const records=data||[];
  if(entity==='Patient'&&ctx.role==='doctor') records.forEach(r=>{r.phone='';r.whatsapp_number='';});
  if(entity==='AuditLog'&&!ADMIN.includes(ctx.role)) records.forEach(r=>{delete r.record_snapshot;});
  return {records,page,page_size:pageSize,has_more:(count||0)>from+records.length};
}
function requireOwner(ctx) { if(!ctx.isOwner) throw Object.assign(new Error('Super Admin access required'),{status:403}); }
async function mirrorUserAndSecurity(ctx,userId,clinicId,role,status='approved') {
  const {data:existing}=await ctx.db.from('User').select('data').eq('id',userId).maybeSingle();
  const {data:authRecord}=await ctx.db.auth.admin.getUserById(userId);
  const authUser=authRecord?.user;
  const metadata={...(authUser?.user_metadata||{}),signup_status:status,...(clinicId?{clinic_id:clinicId}:{}),...(role?{role}:{})};
  const safeData={...(existing?.data||{}),full_name:metadata.full_name||'',phone:metadata.phone||'',clinic_name:metadata.clinic_name||'',...(clinicId?{clinic_id:clinicId}:{})};
  if(role) safeData.role=role;
  const userPatch={id:userId,email:authUser?.email,role:'user',full_name:metadata.full_name||'',phone:metadata.phone||'',clinic_name:metadata.clinic_name||'',signup_status:status,preferred_language:['en','ar','tr'].includes(metadata.preferred_language)?metadata.preferred_language:'en',data:safeData};
  if(clinicId) userPatch.clinic_id=clinicId;
  if(role) userPatch.clinic_role=role;
  const {error:userError}=await ctx.db.from('User').upsert(userPatch,{onConflict:'id'}); if(userError) throw userError;
  const securityPatch={user_id:userId,clinic_id:clinicId||null,signup_status:status,assigned_by_id:ctx.user.id};
  const {error:securityError}=await ctx.db.from('UserSecurityProfile').upsert(securityPatch,{onConflict:'user_id'}); if(securityError) throw securityError;
  if(authUser){ const {error:metaError}=await ctx.db.auth.admin.updateUserById(userId,{user_metadata:metadata}); if(metaError) throw metaError; }
}
async function createNewClinic(ctx,p) {
  requireOwner(ctx);
  const email=String(p.owner_email||'').trim().toLowerCase();
  const existingClinicId=p.existing_clinic_id||null;
  if(!email) throw Object.assign(new Error('Owner email is required'),{status:400});
  if(!existingClinicId && !String(p.clinic_name||'').trim()) throw Object.assign(new Error('Clinic name is required'),{status:400});
  if(email===String(ctx.envOwnerEmail||'').toLowerCase() || email===String(ctx.user.email||'').toLowerCase()) throw Object.assign(new Error('The platform owner cannot be assigned as a clinic owner'),{status:403});
  let clinic=null,createdClinic=false,invitedUser=false,ownerUser=null;
  try {
    if(existingClinicId){const {data,error}=await ctx.db.from('Clinic').select('*').eq('id',existingClinicId).single();if(error)throw Object.assign(new Error('Selected clinic not found'),{status:404});clinic=data;}
    else {const {data,error}=await ctx.db.from('Clinic').insert({name:String(p.clinic_name).trim(),name_ar:p.clinic_name_ar||'',phone:p.phone||'',address:p.address||'',currency:p.currency||'USD',language:p.language||'en',created_by_id:ctx.user.id}).select('*').single();if(error)throw error;clinic=data;createdClinic=true;}
    const {data:usersData,error:listError}=await ctx.db.auth.admin.listUsers({page:1,perPage:1000}); if(listError)throw listError;
    ownerUser=(usersData.users||[]).find(u=>u.email?.toLowerCase()===email)||null;
    if(!ownerUser){const {data:inviteData,error:inviteError}=await ctx.db.auth.admin.inviteUserByEmail(email,{data:{full_name:p.owner_name||''}});if(inviteError)throw inviteError;ownerUser=inviteData.user;invitedUser=!!ownerUser;}
    if(!ownerUser) throw new Error('Unable to resolve invited clinic owner account');
    const {data:existingCras,error:craError}=await ctx.db.from('ClinicRoleAssignment').select('*').eq('user_id',ownerUser.id); if(craError)throw craError;
    const conflicting=(existingCras||[]).filter(c=>c.clinic_id!==clinic.id && (c.status||'active')==='active');
    if(conflicting.length) throw Object.assign(new Error('This user already has an active clinic assignment. Reassign them explicitly before creating another clinic.'),{status:409});
    const {error:assignError}=await ctx.db.from('ClinicRoleAssignment').upsert({user_id:ownerUser.id,clinic_id:clinic.id,role:'clinic_admin',status:'active',assigned_by_id:ctx.user.id,created_by_id:ctx.user.id,assigned_at:new Date().toISOString()},{onConflict:'user_id,clinic_id'}); if(assignError)throw assignError;
    await mirrorUserAndSecurity(ctx,ownerUser.id,clinic.id,'clinic_admin','approved');
    await recordAudit(ctx,clinic.id,'create','Clinic',clinic.id,`Created clinic: ${clinic.name}`);
    return {success:true,clinic:{id:clinic.id,name:clinic.name},owner:{id:ownerUser.id,email,assigned:true},invitation_sent:invitedUser};
  } catch(error) {
    if(createdClinic && clinic?.id) { try{await ctx.db.from('ClinicRoleAssignment').delete().eq('clinic_id',clinic.id);}catch{} try{await ctx.db.from('Clinic').delete().eq('id',clinic.id);}catch{} }
    if(invitedUser && ownerUser?.id) { try{await ctx.db.auth.admin.deleteUser(ownerUser.id);}catch{} }
    throw error;
  }
}
async function assignUserToClinic(ctx,p) {
  requireOwner(ctx);
  const userId=p.user_id, role=p.role||null, status=p.status||'active'; let clinicId=p.clinic_id||null;
  if(!userId) throw Object.assign(new Error('user_id is required'),{status:400});
  if(!['active','pending','not_subscribed'].includes(status)) throw Object.assign(new Error('Invalid status'),{status:400});
  if(role && !['clinic_admin','doctor','receptionist'].includes(role)) throw Object.assign(new Error('Invalid clinic role'),{status:400});
  const {data:user,error:userError}=await ctx.db.from('User').select('*').eq('id',userId).single(); if(userError||!user) throw Object.assign(new Error('Target user not found'),{status:404});
  const targetEmail=String(user.email||'').toLowerCase();
  if(targetEmail===String(ctx.envOwnerEmail||'').toLowerCase() || targetEmail===String(ctx.user.email||'').toLowerCase()) throw Object.assign(new Error('Cannot assign a clinic role to the platform owner'),{status:403});
  let createdClinic=false;
  if(clinicId){const {data:clinic,error}=await ctx.db.from('Clinic').select('id').eq('id',clinicId).maybeSingle();if(error||!clinic)throw Object.assign(new Error('Target clinic not found'),{status:404});}
  else if(role){const {data:clinic,error}=await ctx.db.from('Clinic').insert({name:`New Clinic (${user.email||userId})`,created_by_id:ctx.user.id}).select('id').single();if(error)throw error;clinicId=clinic.id;createdClinic=true;}
  else throw Object.assign(new Error('clinic_id is required when no role is being assigned'),{status:400});
  try {
    if(role){const {error:deleteError}=await ctx.db.from('ClinicRoleAssignment').delete().eq('user_id',userId).neq('clinic_id',clinicId);if(deleteError)throw deleteError;const {error:upsertError}=await ctx.db.from('ClinicRoleAssignment').upsert({user_id:userId,clinic_id:clinicId,role,status,assigned_by_id:ctx.user.id,created_by_id:ctx.user.id,assigned_at:new Date().toISOString()},{onConflict:'user_id,clinic_id'});if(upsertError)throw upsertError;}
    await mirrorUserAndSecurity(ctx,userId,clinicId,role,'approved');
    return {success:true,user_id:userId,clinic_id:clinicId,role,clinic_created:createdClinic};
  } catch(error) { if(createdClinic){try{await ctx.db.from('Clinic').delete().eq('id',clinicId);}catch{}} throw error; }
}
async function completeClinicSetup(ctx,p) {
  if(ctx.role!=='clinic_admin'||!ctx.clinicId) throw Object.assign(new Error('Only clinic administrators can complete clinic setup'),{status:403});
  const required=['name','phone','address','country','city','currency','language']; const missing=required.filter(k=>!p[k] || (typeof p[k]==='string'&&!p[k].trim()));
  if(missing.length) throw Object.assign(new Error(`Missing required fields: ${missing.join(', ')}`),{status:400});
  if(!['USD','SYP','TRY','EUR'].includes(p.currency)) throw Object.assign(new Error('Invalid currency'),{status:400});
  if(!['en','ar','tr'].includes(p.language)) throw Object.assign(new Error('Invalid language'),{status:400});
  const patch={name:p.name.trim(),name_ar:p.name_ar||'',phone:p.phone.trim(),address:p.address.trim(),country:p.country.trim(),city:p.city.trim(),currency:p.currency,language:p.language,setup_completed:true,updated_date:new Date().toISOString()};
  const {data,error}=await ctx.db.from('Clinic').update(patch).eq('id',ctx.clinicId).select('*').single();if(error)throw error;return {success:true,clinic:data};
}
async function saveClinicSettings(ctx,p) {
  if(!['super_admin','admin','clinic_admin'].includes(ctx.role)) throw Object.assign(new Error('Only clinic administrators can manage clinic settings'),{status:403});
  const clinicId=ctx.isOwner?(p.clinic_id||null):ctx.clinicId;
  if(!clinicId) throw Object.assign(new Error('No clinic selected. Create or select a clinic first.'),{status:400});
  if(!p.name||!String(p.name).trim()) throw Object.assign(new Error('Clinic name is required'),{status:400});
  const patch={name:String(p.name).trim(),name_ar:p.name_ar||'',address:p.address||'',phone:p.phone||'',email:p.email||'',country:p.country||'',city:p.city||'',whatsapp_number:p.whatsapp_number||'',currency:p.currency||'USD',logo_url:p.logo_url||'',updated_date:new Date().toISOString()};
  if(p.language!==undefined) patch.language=p.language;
  if(p.reminder_before!==undefined) patch.reminder_before=p.reminder_before;
  const {data,error}=await ctx.db.from('Clinic').update(patch).eq('id',clinicId).select('*').single();if(error)throw error;
  await recordAudit(ctx,clinicId,'update','Clinic',clinicId,'Updated clinic settings');
  return {success:true,created:false,clinic:data};
}
async function approveRegistration(ctx,p) {
  requireOwner(ctx); if(!p.user_id) throw Object.assign(new Error('user_id is required'),{status:400});
  const {data:user,error}=await ctx.db.from('User').select('*').eq('id',p.user_id).single(); if(error||!user) throw Object.assign(new Error('User not found'),{status:404});
  if(user.signup_status==='approved') throw Object.assign(new Error('User is already approved'),{status:400});
  const clinicName=String(user.clinic_name||'').trim(); if(!clinicName) throw Object.assign(new Error('User has no clinic name stored. Cannot auto-create clinic.'),{status:400});
  const {data:clinic,error:createError}=await ctx.db.from('Clinic').insert({name:clinicName,created_by_id:ctx.user.id}).select('*').single();if(createError)throw createError;
  try {const {error:craError}=await ctx.db.from('ClinicRoleAssignment').insert({user_id:p.user_id,clinic_id:clinic.id,role:'clinic_admin',status:'active',assigned_by_id:ctx.user.id,created_by_id:ctx.user.id,assigned_at:new Date().toISOString()});if(craError)throw craError;await mirrorUserAndSecurity(ctx,p.user_id,clinic.id,'clinic_admin','approved');return {success:true,user_id:p.user_id,clinic:{id:clinic.id,name:clinic.name}};}
  catch(e){try{await ctx.db.from('ClinicRoleAssignment').delete().eq('clinic_id',clinic.id).eq('user_id',p.user_id);}catch{}try{await ctx.db.from('Clinic').delete().eq('id',clinic.id);}catch{}throw e;}
}
async function rejectRegistration(ctx,p) {
  requireOwner(ctx); if(!p.user_id) throw Object.assign(new Error('user_id is required'),{status:400});
  const {data:user,error}=await ctx.db.from('User').select('id').eq('id',p.user_id).maybeSingle();if(error||!user)throw Object.assign(new Error('User not found'),{status:404});
  const {error:updateError}=await ctx.db.from('User').update({signup_status:'rejected'}).eq('id',p.user_id);if(updateError)throw updateError;
  const {error:securityError}=await ctx.db.from('UserSecurityProfile').upsert({user_id:p.user_id,signup_status:'rejected',assigned_by_id:ctx.user.id},{onConflict:'user_id'});if(securityError)throw securityError;
  const {data:authRecord}=await ctx.db.auth.admin.getUserById(p.user_id); if(authRecord?.user){const metadata={...(authRecord.user.user_metadata||{}),signup_status:'rejected'};const {error:metaError}=await ctx.db.auth.admin.updateUserById(p.user_id,{user_metadata:metadata});if(metaError)throw metaError;}
  return {success:true,user_id:p.user_id};
}
async function getSuperAdminStats(ctx) {
  requireOwner(ctx);
  const [clinics,doctors,staff,patients,appointments,users]=await Promise.all([
    fetchAllRows(ctx,'Clinic',{},'name'),fetchAllRows(ctx,'Doctor',{},'name'),fetchAllRows(ctx,'Staff',{},'full_name'),fetchAllRows(ctx,'Patient',{},'-created_date'),fetchAllRows(ctx,'Appointment',{},'-date'),fetchAllRows(ctx,'User',{},'-created_date')
  ]);
  const countByClinic=rows=>{const counts={};for(const row of rows)if(row.clinic_id)counts[row.clinic_id]=(counts[row.clinic_id]||0)+1;return counts;};
  const doctorCounts=countByClinic(doctors),staffCounts=countByClinic(staff),patientCounts=countByClinic(patients),appointmentCounts=countByClinic(appointments);
  const clinicsWithStats=clinics.map(c=>({id:c.id,name:c.name,name_ar:c.name_ar,phone:c.phone,address:c.address,currency:c.currency,language:c.language,logo_url:c.logo_url,created_date:c.created_date,is_deleted:c.is_deleted||false,deletion_status:c.deletion_status||'active',deleted_at:c.deleted_at,deleted_by_name:c.deleted_by_name,stats:{doctors:doctorCounts[c.id]||0,staff:staffCounts[c.id]||0,patients:patientCounts[c.id]||0,appointments:appointmentCounts[c.id]||0}}));
  const pendingRequests=users.filter(u=>u.signup_status==='pending').map(u=>({id:u.id,email:u.email,full_name:u.full_name||'',phone:u.phone||'',clinic_name:u.clinic_name||'',created_date:u.created_date}));
  return {clinics:clinicsWithStats,total:clinicsWithStats.length,pendingRequests};
}
async function getSuperAdminUsers(ctx) {
  requireOwner(ctx);
  const {data:users,error:userError}=await ctx.db.from('User').select('*').order('created_date',{ascending:false}).limit(500);if(userError)throw userError;
  const {data:cras,error:craError}=await ctx.db.from('ClinicRoleAssignment').select('*').order('updated_date',{ascending:false}).limit(1000);if(craError)throw craError;
  const active=new Map();for(const cra of cras||[])if(!active.has(cra.user_id))active.set(cra.user_id,cra);
  const {data:deleted}=await ctx.db.from('DeletedUser').select('*').eq('status','pending').order('deleted_at',{ascending:false}).limit(200);
  const deletedMap=new Map((deleted||[]).map(d=>[d.user_id,d]));
  const enriched=(users||[]).map(u=>{const isOwner=String(u.email||'').toLowerCase()===String(ctx.envOwnerEmail||'').toLowerCase();const cra=active.get(u.id);const d=deletedMap.get(u.id);return {id:u.id,email:u.email,full_name:u.full_name||'',role:isOwner?'super_admin':(cra?.role||'unassigned'),clinic_id:isOwner?(u.clinic_id||u.data?.clinic_id||null):(cra?.clinic_id||u.clinic_id||u.data?.clinic_id||null),status:cra?.status||undefined,signup_status:u.signup_status||null,is_deleted:!!d,deleted_at:d?.deleted_at||null};});
  return {users:enriched,deletedUsers:(deleted||[]).map(d=>({id:d.id,user_id:d.user_id,email:d.email,full_name:d.full_name,clinic_id:d.clinic_id,role:d.role,deleted_at:d.deleted_at,deleted_by_name:d.deleted_by_name}))};
}
async function dispatch(name, ctx, payload) {
  if (name !== 'getCurrentUserRole' && !ctx.isOwner && ctx.blockedStatus) throw Object.assign(new Error(ctx.blockedStatus==='not_subscribed'?'Subscription required':ctx.blockedStatus==='rejected'?'Registration rejected':'Account pending approval'),{status:403});
  if (name !== 'getCurrentUserRole' && !ctx.isOwner && !ctx.role) throw Object.assign(new Error('No clinic role assigned'),{status:403,code:'ROLE_NOT_ASSIGNED'});
  if (name === 'getPatientFileSignedUrl') return signedPatientFileUrl(ctx,payload);
  if (name === 'createNewClinic') return createNewClinic(ctx,payload);
  if (name === 'assignUserToClinic') return assignUserToClinic(ctx,payload);
  if (name === 'completeClinicSetup') return completeClinicSetup(ctx,payload);
  if (name === 'saveClinicSettings') return saveClinicSettings(ctx,payload);
  if (name === 'approveRegistration') return approveRegistration(ctx,payload);
  if (name === 'rejectRegistration') return rejectRegistration(ctx,payload);
  if (name === 'getSuperAdminUsers') return getSuperAdminUsers(ctx);
  if (name === 'getSuperAdminStats') return getSuperAdminStats(ctx);
  if (name === 'savePayment') return savePayment(ctx,payload);
  if (name === 'saveDoctorCompensation') return saveDoctorCompensation(ctx,payload);
  if (name === 'getDashboardStats') return getDashboardStats(ctx,payload);
  if (name === 'getDoctorDashboard') return getDoctorDashboard(ctx);
  if (name === 'getDoctorCommissionSummary') return getDoctorCommissionSummary(ctx,payload);
  if (name === 'getMonthlyExpenses') return getMonthlyExpenses(ctx,payload);
  if (name === 'getPaginatedRecords') return getPaginatedRecords(ctx,payload);
  if (name === 'getCurrentUserRole') return currentUserRole(ctx);
  if (name === 'loadUserClinic') return loadUserClinic(ctx, payload);
  if (name === 'clinicScopedCrud') return clinicScopedCrud(ctx, payload);
  // Explicitly fail closed until each legacy function receives a reviewed equivalent.
  if (FUNCTION_NAMES.has(name)) return json({ error: `Migration required: ${name} has not yet been ported. No fake success was returned.`, code: 'FUNCTION_NOT_MIGRATED', function: name }, 501);
  return json({ error: 'Unknown API function' }, 404);
}
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(request, new Response(null, {status:204}));
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return cors(request, json({status:'ok',service:'auradental-worker'}));
      if (url.pathname === '/api/files/upload' || url.pathname === '/api/files/private-upload') {
        if (request.method !== 'POST') return cors(request,json({error:'Method not allowed'},405));
        const auth = await authenticate(request,env); if(auth.error) return cors(request,auth.error);
        if(!auth.clinicId) return cors(request,json({error:'Select a clinic before uploading'},400));
        const form=await request.formData(); const file=form.get('file');
        if(!file || typeof file.arrayBuffer !== 'function') return cors(request,json({error:'File is required'},400));
        const isPrivate=url.pathname.endsWith('private-upload');
        const isImport=!isPrivate && ['text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type);
        const maxBytes=isPrivate?25*1024*1024:(isImport?15*1024*1024:5*1024*1024);
        const allowed=isPrivate?['application/pdf','image/jpeg','image/png','image/webp','image/tiff','application/dicom','application/octet-stream']:(isImport?['text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:['image/jpeg','image/png','image/webp']);
        if(file.size>maxBytes) return cors(request,json({error:`File exceeds ${Math.round(maxBytes/1024/1024)} MB limit`},413));
        if(!allowed.includes(file.type)) return cors(request,json({error:'Unsupported file type'},415));
        const safeName=String(file.name||'upload').normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
        const path=`${auth.clinicId}/${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
        const bucket=isPrivate?'patient-files':(isImport?'clinic-imports':'clinic-assets');
        const {data,error}=await auth.db.storage.from(bucket).upload(path,await file.arrayBuffer(),{contentType:file.type||'application/octet-stream',upsert:false});
        if(error) throw error;
        if(isPrivate) return cors(request,json({file_uri:`storage://patient-files/${data.path}`,file_path:data.path}));
        if(isImport){ const {data:signed,error:signError}=await auth.db.storage.from(bucket).createSignedUrl(data.path,600); if(signError) throw signError; return cors(request,json({file_url:signed.signedUrl,file_path:data.path,expires_in:600})); }
        const {data:publicData}=auth.db.storage.from(bucket).getPublicUrl(data.path);
        return cors(request,json({file_url:publicData.publicUrl,file_path:data.path}));
      }
      const match = url.pathname.match(/^\/api\/functions\/([A-Za-z0-9_-]+)$/);
      if (!match) return env.ASSETS ? env.ASSETS.fetch(request) : cors(request, json({error:'Not found'},404));
      if (request.method !== 'POST') return cors(request, json({error:'Method not allowed'},405));
      const auth = await authenticate(request, env);
      if (auth.error) return cors(request, auth.error);
      const payload = await request.json().catch(()=>({}));
      const result = await dispatch(match[1], auth, payload);
      if (result instanceof Response) return cors(request, result);
      return cors(request, json(result));
    } catch (error) {
      const status = error.status || 500;
      return cors(request, json({error: status === 500 ? 'Internal server error' : error.message, detail: env.ENVIRONMENT === 'development' ? error.message : undefined},status));
    }
  }
};
