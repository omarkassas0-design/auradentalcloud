-- AuraDental Cloud initial schema generated from the source Entity definitions.
-- Review before applying to production. This migration creates an EMPTY schema and does not import source-platform records.
create extension if not exists pgcrypto;
create schema if not exists app_private;

create table if not exists public."Appointment" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "treatment_room" numeric default 1,
  "patient_id" text not null,
  "doctor_id" text not null,
  "date" date not null,
  "start_time" text not null,
  "end_time" text,
  "status" text default 'scheduled',
  "treatment_id" text,
  "treatment_name" text,
  "notes" text,
  "reminder_sent" boolean default false,
  "patient_name" text,
  "doctor_name" text,
  "doctor_color" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "appointment_clinic_id_idx" on public."Appointment" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."AuditLog" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "action" text not null,
  "entity_name" text not null,
  "record_id" text,
  "record_snapshot" jsonb,
  "summary" text,
  "user_id" text,
  "user_name" text,
  "restored" boolean default false,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "auditlog_clinic_id_idx" on public."AuditLog" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Backup" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "backup_type" text default 'manual',
  "file_url" text not null,
  "file_name" text not null,
  "file_size" numeric,
  "status" text default 'pending',
  "notes" text,
  "record_count" jsonb,
  "external_file_id" text,
  "external_backup_status" text default 'pending',
  "external_patient_file_count" numeric default 0,
  "is_safety_backup" boolean default false,
  "patient_file_total" numeric default 0,
  "patient_file_successful" numeric default 0,
  "patient_file_failed" numeric default 0,
  "patient_file_skipped" numeric default 0,
  "patient_file_batch_status" text default 'pending',
  "patient_file_mappings" jsonb default '[]'::jsonb,
  "patient_file_failed_details" jsonb default '[]'::jsonb,
  "patient_file_skipped_details" jsonb default '[]'::jsonb,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "backup_clinic_id_idx" on public."Backup" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Clinic" (
  "id" text primary key default gen_random_uuid()::text,
  "name" text not null,
  "name_ar" text,
  "logo_url" text,
  "address" text,
  "phone" text,
  "email" text,
  "country" text,
  "city" text,
  "currency" text default 'USD',
  "language" text default 'en',
  "setup_completed" boolean default false,
  "reminder_before" numeric,
  "settings" jsonb,
  "whatsapp_number" text,
  "whatsapp_display_name" text,
  "phone_verified" boolean default false,
  "whatsapp_reminders_enabled" boolean default false,
  "reminder_1h_enabled" boolean default false,
  "reminder_3h_enabled" boolean default true,
  "reminder_24h_enabled" boolean default true,
  "reminder_custom_minutes" numeric,
  "reminder_custom_enabled" boolean default false,
  "reminder_template" text default 'Hello {patient_name},

This is a reminder from {clinic_name}.

You have an appointment with Dr. {doctor_name} on {appointment_date} at {appointment_time}.

Please contact us if you need to reschedule.

{clinic_phone}',
  "sms_enabled" boolean default false,
  "email_enabled" boolean default false,
  "email_from_name" text,
  "email_from_address" text,
  "messaging_provider" text default 'twilio',
  "is_deleted" boolean default false,
  "deleted_at" timestamptz,
  "deleted_by" text,
  "deleted_by_name" text,
  "deletion_status" text default 'active',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
-- Clinic has no clinic_id column; access is restricted by explicit policies.

create table if not exists public."ClinicRoleAssignment" (
  "id" text primary key default gen_random_uuid()::text,
  "user_id" text not null,
  "clinic_id" text not null,
  "role" text not null,
  "status" text default 'active',
  "assigned_by_id" text,
  "assigned_at" timestamptz,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "clinicroleassignment_clinic_id_idx" on public."ClinicRoleAssignment" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."ConsentForm" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "patient_name" text,
  "template_key" text not null,
  "template_name" text,
  "procedure_name" text,
  "procedure_date" date,
  "doctor_id" text,
  "doctor_name" text,
  "consent_body" text not null,
  "patient_signature" text,
  "signed_at" timestamptz,
  "status" text default 'signed' not null,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "consentform_clinic_id_idx" on public."ConsentForm" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."DeletedUser" (
  "id" text primary key default gen_random_uuid()::text,
  "user_id" text not null,
  "email" text,
  "full_name" text,
  "clinic_id" text,
  "role" text,
  "status" text default 'pending' not null,
  "deleted_at" timestamptz not null,
  "deleted_by" text,
  "deleted_by_name" text,
  "restored_at" timestamptz,
  "restored_by" text,
  "cra_snapshot" jsonb,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "deleteduser_clinic_id_idx" on public."DeletedUser" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Doctor" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "name" text not null,
  "specialty" text,
  "phone" text,
  "calendar_color" text,
  "schedule" jsonb,
  "user_id" text,
  "commission_percentage" numeric default 0,
  "commission_percentage_doctor" numeric default 0,
  "commission_percentage_clinic" numeric default 0,
  "monthly_salary" numeric default 0,
  "salary_currency" text default 'USD',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "doctor_clinic_id_idx" on public."Doctor" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."DoctorPayout" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "doctor_id" text not null,
  "doctor_name" text,
  "amount" numeric not null,
  "currency" text default 'USD' not null,
  "payment_date" date not null,
  "notes" text,
  "period_start" date,
  "period_end" date,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "doctorpayout_clinic_id_idx" on public."DoctorPayout" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Expense" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "name" text not null,
  "amount" numeric not null,
  "currency" text default 'USD',
  "expense_date" date not null,
  "category" text,
  "notes" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "expense_clinic_id_idx" on public."Expense" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Invoice" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "patient_name" text,
  "invoice_number" text not null,
  "invoice_date" date not null,
  "type" text not null,
  "doctor_id" text,
  "doctor_name" text,
  "items" jsonb,
  "payment_ids" jsonb,
  "payments_snapshot" jsonb,
  "totals" jsonb,
  "notes" text,
  "status" text default 'active',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "invoice_clinic_id_idx" on public."Invoice" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."LabCase" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "patient_name" text,
  "patient_treatment_id" text,
  "patient_treatment_ids" jsonb default '[]'::jsonb,
  "doctor_id" text,
  "doctor_name" text,
  "lab_id" text not null,
  "lab_name" text,
  "case_type" text not null,
  "description" text,
  "due_date" date,
  "sent_date" date,
  "received_date" date,
  "cost" numeric,
  "patient_price" numeric default 0,
  "patient_paid_amount" numeric default 0,
  "currency" text default 'USD',
  "status" text default 'sent',
  "notes" text,
  "attachments" jsonb,
  "net_amount" numeric default 0,
  "doctor_commission_percentage" numeric default 0,
  "doctor_commission_amount" numeric default 0,
  "clinic_share" numeric default 0,
  "is_finalized" boolean default false,
  "finalized_at" timestamptz,
  "finalized_by" text,
  "finalized_by_name" text,
  "expense_id" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "labcase_clinic_id_idx" on public."LabCase" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Laboratory" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "name" text not null,
  "contact_person" text,
  "phone" text,
  "whatsapp" text,
  "email" text,
  "address" text,
  "notes" text,
  "status" text default 'active',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "laboratory_clinic_id_idx" on public."Laboratory" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."MessageLog" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "channel" text not null,
  "message_type" text default 'custom',
  "recipient" text not null,
  "recipient_name" text,
  "patient_id" text,
  "appointment_id" text,
  "subject" text,
  "body" text not null,
  "status" text default 'pending' not null,
  "provider" text,
  "provider_message_id" text,
  "error_code" text,
  "error_message" text,
  "sent_at" timestamptz,
  "template_variables" jsonb,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "messagelog_clinic_id_idx" on public."MessageLog" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Notification" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "user_id" text,
  "type" text not null,
  "title" text not null,
  "message" text not null,
  "link" text,
  "read" boolean default false,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "notification_clinic_id_idx" on public."Notification" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Patient" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "full_name" text not null,
  "phone" text not null,
  "whatsapp_number" text,
  "whatsapp_opt_in" boolean default false,
  "patient_source" text,
  "referring_doctor_id" text,
  "referring_doctor_name" text,
  "assigned_doctor_id" text,
  "assigned_doctor_name" text,
  "gender" text,
  "birth_date" date,
  "address" text,
  "notes" text,
  "phone_verified" boolean default false,
  "medical_info" jsonb,
  "dental_history" jsonb,
  "recall_date" date,
  "recall_interval_months" numeric,
  "recall_status" text default 'pending',
  "recall_notes" text,
  "last_recall_date" date,
  "plan_discount_type" text default 'none',
  "plan_discount_value" numeric default 0,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "patient_clinic_id_idx" on public."Patient" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."PatientFile" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "file_url" text not null,
  "file_uri" text,
  "file_name" text not null,
  "file_type" text,
  "before_after_tag" text,
  "associated_treatment_id" text,
  "notes" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "patientfile_clinic_id_idx" on public."PatientFile" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."PatientTreatment" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "treatment_id" text,
  "treatment_name" text not null,
  "description" text,
  "price" numeric not null,
  "currency" text default 'USD',
  "paid_amount" numeric default 0,
  "discount_type" text default 'none',
  "discount_value" numeric default 0,
  "status" text default 'planned',
  "tooth_numbers" jsonb,
  "tooth_surfaces" jsonb default '{}'::jsonb,
  "doctor_id" text,
  "doctor_name" text,
  "doctor_commission_percentage" numeric default 0,
  "doctor_commission_amount" numeric default 0,
  "treatment_date" date,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "patienttreatment_clinic_id_idx" on public."PatientTreatment" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Payment" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "patient_treatment_id" text,
  "doctor_id" text not null,
  "doctor_name" text,
  "doctor_commission_percentage" numeric default 0,
  "doctor_commission_amount" numeric default 0,
  "is_prosthesis" boolean default false,
  "prosthesis_cost" numeric default 0,
  "net_amount" numeric default 0,
  "amount" numeric not null,
  "currency" text default 'USD',
  "method" text default 'cash',
  "notes" text,
  "payment_date" date,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "payment_clinic_id_idx" on public."Payment" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."PendingClinicDeletion" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "clinic_name" text,
  "requested_by_id" text not null,
  "requested_by_name" text,
  "requested_at" timestamptz,
  "expires_at" timestamptz not null,
  "status" text default 'pending' not null,
  "executed_at" timestamptz,
  "cancelled_at" timestamptz,
  "restored_at" timestamptz,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "pendingclinicdeletion_clinic_id_idx" on public."PendingClinicDeletion" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."PendingPermanentDeletion" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "clinic_name" text,
  "requested_by_id" text not null,
  "requested_by_name" text,
  "requested_at" timestamptz,
  "expires_at" timestamptz not null,
  "status" text default 'pending' not null,
  "executed_at" timestamptz,
  "cancelled_at" timestamptz,
  "failed_at" timestamptz,
  "failure_reason" text,
  "deletion_results" jsonb,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "pendingpermanentdeletion_clinic_id_idx" on public."PendingPermanentDeletion" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Purchase" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "name" text not null,
  "category" text,
  "supplier" text,
  "quantity" numeric default 1,
  "unit" text,
  "amount" numeric not null,
  "currency" text default 'USD',
  "purchase_date" date not null,
  "notes" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "purchase_clinic_id_idx" on public."Purchase" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."ReminderLog" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "patient_id" text not null,
  "patient_name" text,
  "patient_phone" text not null,
  "appointment_id" text not null,
  "message" text,
  "reminder_type" text not null,
  "scheduled_time" timestamptz not null,
  "sent_time" timestamptz,
  "status" text default 'pending',
  "error_message" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "reminderlog_clinic_id_idx" on public."ReminderLog" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."RestoreLock" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "locked_by_user_id" text not null,
  "locked_by_name" text,
  "locked_at" timestamptz not null,
  "expires_at" timestamptz not null,
  "status" text default 'active' not null,
  "backup_id" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "restorelock_clinic_id_idx" on public."RestoreLock" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."ScheduledReport" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "report_type" text not null,
  "frequency" text not null,
  "email_recipients" jsonb not null,
  "enabled" boolean default true,
  "last_sent_at" timestamptz,
  "next_send_at" timestamptz,
  "created_by_id" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "scheduledreport_clinic_id_idx" on public."ScheduledReport" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Shift" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "employee_id" text not null,
  "employee_name" text,
  "employee_position" text,
  "shift_type" text default 'morning',
  "days_of_week" jsonb not null,
  "start_time" text not null,
  "end_time" text not null,
  "break_duration_minutes" numeric default 60,
  "weekly_off_days" jsonb,
  "notes" text,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "shift_clinic_id_idx" on public."Shift" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Staff" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "user_id" text,
  "full_name" text not null,
  "employee_id" text,
  "phone" text,
  "email" text,
  "address" text,
  "national_id" text,
  "position" text not null,
  "department" text,
  "hire_date" date,
  "status" text default 'active',
  "notes" text,
  "salary" numeric,
  "salary_currency" text default 'USD',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "staff_clinic_id_idx" on public."Staff" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."Treatment" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "name" text not null,
  "category" text,
  "description" text,
  "notes" text,
  "applicable_surfaces" jsonb,
  "default_price" numeric,
  "currency" text default 'USD',
  "duration_minutes" numeric,
  "status" text default 'active',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "treatment_clinic_id_idx" on public."Treatment" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."User" (
  "id" text primary key default gen_random_uuid()::text,
  "role" text default 'user',
  "clinic_id" text,
  "clinic_role" text,
  "preferred_language" text default 'en',
  "phone" text,
  "clinic_name" text,
  "signup_status" text default 'pending',
  "data" jsonb,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "user_clinic_id_idx" on public."User" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."UserSecurityProfile" (
  "id" text primary key default gen_random_uuid()::text,
  "user_id" text not null,
  "clinic_id" text,
  "role" text,
  "signup_status" text,
  "assigned_by_id" text,
  "last_revert_at" timestamptz,
  "revert_count" numeric default 0,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "usersecurityprofile_clinic_id_idx" on public."UserSecurityProfile" ("clinic_id") where "clinic_id" is not null;

create table if not exists public."VerificationOTP" (
  "id" text primary key default gen_random_uuid()::text,
  "clinic_id" text not null,
  "phone_number" text not null,
  "otp_code" text not null,
  "expires_at" timestamptz not null,
  "attempts" numeric default 0,
  "status" text default 'pending',
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now()
);
create index if not exists "verificationotp_clinic_id_idx" on public."VerificationOTP" ("clinic_id") where "clinic_id" is not null;

create or replace function app_private.current_user_clinic_ids()
returns setof text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select cra.clinic_id
  from public."ClinicRoleAssignment" cra
  where cra.user_id = auth.uid()::text and coalesce(cra.status, 'active') = 'active';
$$;
revoke all on function app_private.current_user_clinic_ids() from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_clinic_ids() to authenticated;

alter table public."Appointment" enable row level security;
create policy "appointment_select_member" on public."Appointment" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "appointment_insert_member" on public."Appointment" for insert to authenticated with check (false);
create policy "appointment_update_member" on public."Appointment" for update to authenticated using (false) with check (false);
create policy "appointment_delete_member" on public."Appointment" for delete to authenticated using (false);

alter table public."AuditLog" enable row level security;
create policy "auditlog_select_member" on public."AuditLog" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "auditlog_insert_member" on public."AuditLog" for insert to authenticated with check (false);
create policy "auditlog_update_member" on public."AuditLog" for update to authenticated using (false) with check (false);
create policy "auditlog_delete_member" on public."AuditLog" for delete to authenticated using (false);

alter table public."Backup" enable row level security;
create policy "backup_select_member" on public."Backup" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "backup_insert_member" on public."Backup" for insert to authenticated with check (false);
create policy "backup_update_member" on public."Backup" for update to authenticated using (false) with check (false);
create policy "backup_delete_member" on public."Backup" for delete to authenticated using (false);

alter table public."Clinic" enable row level security;
create policy "clinic_read_member" on public."Clinic" for select to authenticated using (id in (select app_private.current_user_clinic_ids()));

create unique index if not exists "cra_user_clinic_unique" on public."ClinicRoleAssignment" ("user_id","clinic_id");
create unique index if not exists "cra_one_active_per_user" on public."ClinicRoleAssignment" ("user_id") where coalesce("status",'active') = 'active';
alter table public."ClinicRoleAssignment" enable row level security;
create policy "clinicroleassignment_read_self" on public."ClinicRoleAssignment" for select to authenticated using (user_id = auth.uid()::text);

alter table public."ConsentForm" enable row level security;
create policy "consentform_select_member" on public."ConsentForm" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "consentform_insert_member" on public."ConsentForm" for insert to authenticated with check (false);
create policy "consentform_update_member" on public."ConsentForm" for update to authenticated using (false) with check (false);
create policy "consentform_delete_member" on public."ConsentForm" for delete to authenticated using (false);

alter table public."DeletedUser" enable row level security;
create policy "deleteduser_select_member" on public."DeletedUser" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "deleteduser_insert_member" on public."DeletedUser" for insert to authenticated with check (false);
create policy "deleteduser_update_member" on public."DeletedUser" for update to authenticated using (false) with check (false);
create policy "deleteduser_delete_member" on public."DeletedUser" for delete to authenticated using (false);

alter table public."Doctor" enable row level security;
create policy "doctor_select_member" on public."Doctor" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "doctor_insert_member" on public."Doctor" for insert to authenticated with check (false);
create policy "doctor_update_member" on public."Doctor" for update to authenticated using (false) with check (false);
create policy "doctor_delete_member" on public."Doctor" for delete to authenticated using (false);

alter table public."DoctorPayout" enable row level security;
create policy "doctorpayout_select_member" on public."DoctorPayout" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "doctorpayout_insert_member" on public."DoctorPayout" for insert to authenticated with check (false);
create policy "doctorpayout_update_member" on public."DoctorPayout" for update to authenticated using (false) with check (false);
create policy "doctorpayout_delete_member" on public."DoctorPayout" for delete to authenticated using (false);

alter table public."Expense" enable row level security;
create policy "expense_select_member" on public."Expense" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "expense_insert_member" on public."Expense" for insert to authenticated with check (false);
create policy "expense_update_member" on public."Expense" for update to authenticated using (false) with check (false);
create policy "expense_delete_member" on public."Expense" for delete to authenticated using (false);

alter table public."Invoice" enable row level security;
create policy "invoice_select_member" on public."Invoice" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "invoice_insert_member" on public."Invoice" for insert to authenticated with check (false);
create policy "invoice_update_member" on public."Invoice" for update to authenticated using (false) with check (false);
create policy "invoice_delete_member" on public."Invoice" for delete to authenticated using (false);

alter table public."LabCase" enable row level security;
create policy "labcase_select_member" on public."LabCase" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "labcase_insert_member" on public."LabCase" for insert to authenticated with check (false);
create policy "labcase_update_member" on public."LabCase" for update to authenticated using (false) with check (false);
create policy "labcase_delete_member" on public."LabCase" for delete to authenticated using (false);

alter table public."Laboratory" enable row level security;
create policy "laboratory_select_member" on public."Laboratory" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "laboratory_insert_member" on public."Laboratory" for insert to authenticated with check (false);
create policy "laboratory_update_member" on public."Laboratory" for update to authenticated using (false) with check (false);
create policy "laboratory_delete_member" on public."Laboratory" for delete to authenticated using (false);

alter table public."MessageLog" enable row level security;
create policy "messagelog_select_member" on public."MessageLog" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "messagelog_insert_member" on public."MessageLog" for insert to authenticated with check (false);
create policy "messagelog_update_member" on public."MessageLog" for update to authenticated using (false) with check (false);
create policy "messagelog_delete_member" on public."MessageLog" for delete to authenticated using (false);

alter table public."Notification" enable row level security;
create policy "notification_select_member" on public."Notification" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "notification_insert_member" on public."Notification" for insert to authenticated with check (false);
create policy "notification_update_member" on public."Notification" for update to authenticated using (false) with check (false);
create policy "notification_delete_member" on public."Notification" for delete to authenticated using (false);

alter table public."Patient" enable row level security;
create policy "patient_select_member" on public."Patient" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "patient_insert_member" on public."Patient" for insert to authenticated with check (false);
create policy "patient_update_member" on public."Patient" for update to authenticated using (false) with check (false);
create policy "patient_delete_member" on public."Patient" for delete to authenticated using (false);

alter table public."PatientFile" enable row level security;
create policy "patientfile_select_member" on public."PatientFile" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "patientfile_insert_member" on public."PatientFile" for insert to authenticated with check (false);
create policy "patientfile_update_member" on public."PatientFile" for update to authenticated using (false) with check (false);
create policy "patientfile_delete_member" on public."PatientFile" for delete to authenticated using (false);

alter table public."PatientTreatment" enable row level security;
create policy "patienttreatment_select_member" on public."PatientTreatment" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "patienttreatment_insert_member" on public."PatientTreatment" for insert to authenticated with check (false);
create policy "patienttreatment_update_member" on public."PatientTreatment" for update to authenticated using (false) with check (false);
create policy "patienttreatment_delete_member" on public."PatientTreatment" for delete to authenticated using (false);

alter table public."Payment" enable row level security;
create policy "payment_select_member" on public."Payment" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "payment_insert_member" on public."Payment" for insert to authenticated with check (false);
create policy "payment_update_member" on public."Payment" for update to authenticated using (false) with check (false);
create policy "payment_delete_member" on public."Payment" for delete to authenticated using (false);

alter table public."PendingClinicDeletion" enable row level security;
create policy "pendingclinicdeletion_select_member" on public."PendingClinicDeletion" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "pendingclinicdeletion_insert_member" on public."PendingClinicDeletion" for insert to authenticated with check (false);
create policy "pendingclinicdeletion_update_member" on public."PendingClinicDeletion" for update to authenticated using (false) with check (false);
create policy "pendingclinicdeletion_delete_member" on public."PendingClinicDeletion" for delete to authenticated using (false);

alter table public."PendingPermanentDeletion" enable row level security;
create policy "pendingpermanentdeletion_select_member" on public."PendingPermanentDeletion" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "pendingpermanentdeletion_insert_member" on public."PendingPermanentDeletion" for insert to authenticated with check (false);
create policy "pendingpermanentdeletion_update_member" on public."PendingPermanentDeletion" for update to authenticated using (false) with check (false);
create policy "pendingpermanentdeletion_delete_member" on public."PendingPermanentDeletion" for delete to authenticated using (false);

alter table public."Purchase" enable row level security;
create policy "purchase_select_member" on public."Purchase" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "purchase_insert_member" on public."Purchase" for insert to authenticated with check (false);
create policy "purchase_update_member" on public."Purchase" for update to authenticated using (false) with check (false);
create policy "purchase_delete_member" on public."Purchase" for delete to authenticated using (false);

alter table public."ReminderLog" enable row level security;
create policy "reminderlog_select_member" on public."ReminderLog" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "reminderlog_insert_member" on public."ReminderLog" for insert to authenticated with check (false);
create policy "reminderlog_update_member" on public."ReminderLog" for update to authenticated using (false) with check (false);
create policy "reminderlog_delete_member" on public."ReminderLog" for delete to authenticated using (false);

alter table public."RestoreLock" enable row level security;
create policy "restorelock_select_member" on public."RestoreLock" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "restorelock_insert_member" on public."RestoreLock" for insert to authenticated with check (false);
create policy "restorelock_update_member" on public."RestoreLock" for update to authenticated using (false) with check (false);
create policy "restorelock_delete_member" on public."RestoreLock" for delete to authenticated using (false);

alter table public."ScheduledReport" enable row level security;
create policy "scheduledreport_select_member" on public."ScheduledReport" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "scheduledreport_insert_member" on public."ScheduledReport" for insert to authenticated with check (false);
create policy "scheduledreport_update_member" on public."ScheduledReport" for update to authenticated using (false) with check (false);
create policy "scheduledreport_delete_member" on public."ScheduledReport" for delete to authenticated using (false);

alter table public."Shift" enable row level security;
create policy "shift_select_member" on public."Shift" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "shift_insert_member" on public."Shift" for insert to authenticated with check (false);
create policy "shift_update_member" on public."Shift" for update to authenticated using (false) with check (false);
create policy "shift_delete_member" on public."Shift" for delete to authenticated using (false);

alter table public."Staff" enable row level security;
create policy "staff_select_member" on public."Staff" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "staff_insert_member" on public."Staff" for insert to authenticated with check (false);
create policy "staff_update_member" on public."Staff" for update to authenticated using (false) with check (false);
create policy "staff_delete_member" on public."Staff" for delete to authenticated using (false);

alter table public."Treatment" enable row level security;
create policy "treatment_select_member" on public."Treatment" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "treatment_insert_member" on public."Treatment" for insert to authenticated with check (false);
create policy "treatment_update_member" on public."Treatment" for update to authenticated using (false) with check (false);
create policy "treatment_delete_member" on public."Treatment" for delete to authenticated using (false);

alter table public."User" enable row level security;
create policy "user_read_self" on public."User" for select to authenticated using (id = auth.uid()::text);
create policy "user_update_self_profile" on public."User" for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);

alter table public."UserSecurityProfile" enable row level security;
create policy "usersecurityprofile_read_self" on public."UserSecurityProfile" for select to authenticated using (user_id = auth.uid()::text);

alter table public."VerificationOTP" enable row level security;
create policy "verificationotp_select_member" on public."VerificationOTP" for select to authenticated using (clinic_id in (select app_private.current_user_clinic_ids()));
create policy "verificationotp_insert_member" on public."VerificationOTP" for insert to authenticated with check (false);
create policy "verificationotp_update_member" on public."VerificationOTP" for update to authenticated using (false) with check (false);
create policy "verificationotp_delete_member" on public."VerificationOTP" for delete to authenticated using (false);



-- Storage buckets: clinic branding assets are public; patient records remain private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clinic-assets', 'clinic-assets', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('patient-files', 'patient-files', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp','image/tiff','application/dicom','application/octet-stream']),
  ('clinic-imports', 'clinic-imports', false, 15728640, array['text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;


-- Atomic treatment-plan discount operation. Mirrors the source planDiscount.ts rules.
create or replace function public.apply_plan_discount(
  p_patient_id text,
  p_clinic_id text,
  p_discount_type text,
  p_discount_value numeric
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_currency text;
  v_total numeric(14,2);
  v_value numeric(14,2);
  v_count integer := 0;
  v_patient jsonb;
  v_remaining numeric(14,2);
  v_row record;
  v_share numeric(14,2);
  v_index integer := 0;
  v_rows integer := 0;
begin
  if p_discount_type not in ('none','percentage','fixed') then raise exception 'Invalid discount type'; end if;
  if p_discount_type = 'percentage' and (p_discount_value is null or p_discount_value <= 0 or p_discount_value > 100) then raise exception 'Discount percentage must be between 0 and 100'; end if;
  if p_discount_type = 'fixed' and (p_discount_value is null or p_discount_value < 0) then raise exception 'Discount amount cannot be negative'; end if;
  select currency into v_currency from public."Clinic" where id=p_clinic_id;
  if not found then raise exception 'Clinic not found'; end if;
  if not exists(select 1 from public."Patient" where id=p_patient_id and clinic_id=p_clinic_id) then raise exception 'Patient not found'; end if;
  v_value := round(coalesce(p_discount_value,0),2);
  if p_discount_type='none' then
    update public."PatientTreatment" set discount_type='none', discount_value=0, updated_date=now() where clinic_id=p_clinic_id and patient_id=p_patient_id;
    get diagnostics v_count = row_count;
  elsif p_discount_type='percentage' then
    update public."PatientTreatment" set discount_type='percentage', discount_value=v_value, updated_date=now() where clinic_id=p_clinic_id and patient_id=p_patient_id;
    get diagnostics v_count = row_count;
  else
    select round(coalesce(sum(price),0),2), count(*) into v_total, v_rows from public."PatientTreatment" where clinic_id=p_clinic_id and patient_id=p_patient_id and coalesce(currency,'USD')=coalesce(v_currency,'USD');
    if v_rows > 0 and v_value > v_total then raise exception 'The discount is larger than the eligible treatment total'; end if;
    v_remaining := least(v_value,v_total);
    for v_row in select id, round(coalesce(price,0),2) as price from public."PatientTreatment" where clinic_id=p_clinic_id and patient_id=p_patient_id and coalesce(currency,'USD')=coalesce(v_currency,'USD') order by created_date,id loop
      v_index := v_index + 1;
      if v_index = v_rows then v_share := v_remaining;
      else v_share := case when v_total=0 then 0 else round((least(v_value,v_total)/v_total)*v_row.price,2) end; end if;
      v_share := greatest(0,least(v_share,v_row.price));
      v_remaining := round(v_remaining-v_share,2);
      update public."PatientTreatment" set discount_type='fixed', discount_value=v_share, updated_date=now() where id=v_row.id and clinic_id=p_clinic_id;
      v_count := v_count + 1;
    end loop;
    update public."PatientTreatment" set discount_type='none', discount_value=0, updated_date=now() where clinic_id=p_clinic_id and patient_id=p_patient_id and coalesce(currency,'USD')<>coalesce(v_currency,'USD');
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end if;
  update public."Patient" set plan_discount_type=p_discount_type, plan_discount_value=case when p_discount_type='none' then 0 else v_value end, updated_date=now() where id=p_patient_id and clinic_id=p_clinic_id;
  select to_jsonb(p) into v_patient from public."Patient" p where id=p_patient_id and clinic_id=p_clinic_id;
  return jsonb_build_object('patient',v_patient,'updated_treatments',v_count,'discount_type',p_discount_type,'discount_value',case when p_discount_type='none' then 0 else v_value end);
end;
$$;
revoke all on function public.apply_plan_discount(text,text,text,numeric) from public, anon, authenticated;
grant execute on function public.apply_plan_discount(text,text,text,numeric) to service_role;



-- Built-in record metadata fields supplied by the original entity platform.
alter table public."Appointment" add column if not exists "created_by_id" text;
alter table public."AuditLog" add column if not exists "created_by_id" text;
alter table public."Backup" add column if not exists "created_by_id" text;
alter table public."Clinic" add column if not exists "created_by_id" text;
alter table public."ClinicRoleAssignment" add column if not exists "created_by_id" text;
alter table public."ConsentForm" add column if not exists "created_by_id" text;
alter table public."DeletedUser" add column if not exists "created_by_id" text;
alter table public."Doctor" add column if not exists "created_by_id" text;
alter table public."DoctorPayout" add column if not exists "created_by_id" text;
alter table public."Expense" add column if not exists "created_by_id" text;
alter table public."Invoice" add column if not exists "created_by_id" text;
alter table public."LabCase" add column if not exists "created_by_id" text;
alter table public."Laboratory" add column if not exists "created_by_id" text;
alter table public."MessageLog" add column if not exists "created_by_id" text;
alter table public."Notification" add column if not exists "created_by_id" text;
alter table public."Patient" add column if not exists "created_by_id" text;
alter table public."PatientFile" add column if not exists "created_by_id" text;
alter table public."PatientTreatment" add column if not exists "created_by_id" text;
alter table public."Payment" add column if not exists "created_by_id" text;
alter table public."PendingClinicDeletion" add column if not exists "created_by_id" text;
alter table public."PendingPermanentDeletion" add column if not exists "created_by_id" text;
alter table public."Purchase" add column if not exists "created_by_id" text;
alter table public."ReminderLog" add column if not exists "created_by_id" text;
alter table public."RestoreLock" add column if not exists "created_by_id" text;
alter table public."ScheduledReport" add column if not exists "created_by_id" text;
alter table public."Shift" add column if not exists "created_by_id" text;
alter table public."Staff" add column if not exists "created_by_id" text;
alter table public."Treatment" add column if not exists "created_by_id" text;
alter table public."User" add column if not exists "created_by_id" text;
alter table public."UserSecurityProfile" add column if not exists "created_by_id" text;
alter table public."VerificationOTP" add column if not exists "created_by_id" text;
alter table public."User" add column if not exists "email" text;
alter table public."User" add column if not exists "full_name" text;
create index if not exists "user_email_idx" on public."User" (lower("email"));

-- Enum validation and relation lookup indexes derived from the original entity definitions.
alter table public."Appointment" add constraint "appointment_treatment_room_enum_check" check ("treatment_room" is null or "treatment_room" in (1, 2, 3, 4, 5));
alter table public."Appointment" add constraint "appointment_status_enum_check" check ("status" is null or "status" in ('scheduled', 'confirmed', 'waiting', 'completed', 'no_show', 'cancelled'));
alter table public."AuditLog" add constraint "auditlog_action_enum_check" check ("action" is null or "action" in ('create', 'update', 'delete', 'restore'));
alter table public."Backup" add constraint "backup_backup_type_enum_check" check ("backup_type" is null or "backup_type" in ('manual', 'automatic', 'google_drive'));
alter table public."Backup" add constraint "backup_status_enum_check" check ("status" is null or "status" in ('pending', 'completed', 'failed'));
alter table public."Backup" add constraint "backup_external_backup_status_enum_check" check ("external_backup_status" is null or "external_backup_status" in ('pending', 'uploaded', 'failed', 'skipped'));
alter table public."Backup" add constraint "backup_patient_file_batch_status_enum_check" check ("patient_file_batch_status" is null or "patient_file_batch_status" in ('pending', 'in_progress', 'completed', 'failed', 'not_applicable'));
alter table public."Clinic" add constraint "clinic_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Clinic" add constraint "clinic_language_enum_check" check ("language" is null or "language" in ('en', 'ar', 'tr'));
alter table public."Clinic" add constraint "clinic_messaging_provider_enum_check" check ("messaging_provider" is null or "messaging_provider" in ('twilio', 'meta'));
alter table public."Clinic" add constraint "clinic_deletion_status_enum_check" check ("deletion_status" is null or "deletion_status" in ('active', 'soft_deleted'));
alter table public."ClinicRoleAssignment" add constraint "clinicroleassignment_role_enum_check" check ("role" is null or "role" in ('clinic_admin', 'doctor', 'receptionist'));
alter table public."ClinicRoleAssignment" add constraint "clinicroleassignment_status_enum_check" check ("status" is null or "status" in ('active', 'pending', 'not_subscribed'));
alter table public."ConsentForm" add constraint "consentform_status_enum_check" check ("status" is null or "status" in ('signed', 'void'));
alter table public."DeletedUser" add constraint "deleteduser_role_enum_check" check ("role" is null or "role" in ('clinic_admin', 'doctor', 'receptionist'));
alter table public."DeletedUser" add constraint "deleteduser_status_enum_check" check ("status" is null or "status" in ('pending', 'restored'));
alter table public."Doctor" add constraint "doctor_salary_currency_enum_check" check ("salary_currency" is null or "salary_currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."DoctorPayout" add constraint "doctorpayout_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Expense" add constraint "expense_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Invoice" add constraint "invoice_type_enum_check" check ("type" is null or "type" in ('invoice', 'receipt'));
alter table public."Invoice" add constraint "invoice_status_enum_check" check ("status" is null or "status" in ('active', 'void'));
alter table public."LabCase" add constraint "labcase_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."LabCase" add constraint "labcase_status_enum_check" check ("status" is null or "status" in ('sent', 'in_progress', 'ready', 'delivered', 'cancelled'));
alter table public."Laboratory" add constraint "laboratory_status_enum_check" check ("status" is null or "status" in ('active', 'inactive'));
alter table public."MessageLog" add constraint "messagelog_channel_enum_check" check ("channel" is null or "channel" in ('sms', 'whatsapp', 'email'));
alter table public."MessageLog" add constraint "messagelog_message_type_enum_check" check ("message_type" is null or "message_type" in ('appointment_reminder', 'appointment_confirmation', 'invoice', 'treatment_plan', 'custom', 'verification_otp'));
alter table public."MessageLog" add constraint "messagelog_status_enum_check" check ("status" is null or "status" in ('pending', 'sent', 'failed', 'delivered', 'undelivered'));
alter table public."MessageLog" add constraint "messagelog_provider_enum_check" check ("provider" is null or "provider" in ('twilio', 'resend', 'meta_whatsapp'));
alter table public."Notification" add constraint "notification_type_enum_check" check ("type" is null or "type" in ('lab_ready', 'appointment_reminder', 'payment_received', 'xray_uploaded', 'schedule_changed'));
alter table public."Patient" add constraint "patient_patient_source_enum_check" check ("patient_source" is null or "patient_source" in ('doctor', 'clinic'));
alter table public."Patient" add constraint "patient_gender_enum_check" check ("gender" is null or "gender" in ('male', 'female'));
alter table public."Patient" add constraint "patient_recall_status_enum_check" check ("recall_status" is null or "recall_status" in ('pending', 'contacted', 'scheduled', 'not_interested'));
alter table public."Patient" add constraint "patient_plan_discount_type_enum_check" check ("plan_discount_type" is null or "plan_discount_type" in ('none', 'percentage', 'fixed'));
alter table public."PatientFile" add constraint "patientfile_file_type_enum_check" check ("file_type" is null or "file_type" in ('image', 'pdf', 'xray', 'document'));
alter table public."PatientFile" add constraint "patientfile_before_after_tag_enum_check" check ("before_after_tag" is null or "before_after_tag" in ('before', 'after'));
alter table public."PatientTreatment" add constraint "patienttreatment_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."PatientTreatment" add constraint "patienttreatment_discount_type_enum_check" check ("discount_type" is null or "discount_type" in ('percentage', 'fixed', 'none'));
alter table public."PatientTreatment" add constraint "patienttreatment_status_enum_check" check ("status" is null or "status" in ('planned', 'in_progress', 'completed', 'cancelled'));
alter table public."Payment" add constraint "payment_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Payment" add constraint "payment_method_enum_check" check ("method" is null or "method" in ('cash', 'card', 'transfer', 'other'));
alter table public."PendingClinicDeletion" add constraint "pendingclinicdeletion_status_enum_check" check ("status" is null or "status" in ('pending', 'cancelled', 'executed', 'restored'));
alter table public."PendingPermanentDeletion" add constraint "pendingpermanentdeletion_status_enum_check" check ("status" is null or "status" in ('pending', 'cancelled', 'executed', 'failed'));
alter table public."Purchase" add constraint "purchase_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."ReminderLog" add constraint "reminderlog_reminder_type_enum_check" check ("reminder_type" is null or "reminder_type" in ('24h', '12h', '2h'));
alter table public."ReminderLog" add constraint "reminderlog_status_enum_check" check ("status" is null or "status" in ('pending', 'sent', 'failed'));
alter table public."RestoreLock" add constraint "restorelock_status_enum_check" check ("status" is null or "status" in ('active', 'released', 'expired'));
alter table public."ScheduledReport" add constraint "scheduledreport_report_type_enum_check" check ("report_type" is null or "report_type" in ('daily_summary', 'weekly_summary', 'monthly_summary', 'revenue_summary', 'expense_summary', 'payment_summary', 'outstanding_balances', 'appointment_statistics', 'clinic_performance'));
alter table public."ScheduledReport" add constraint "scheduledreport_frequency_enum_check" check ("frequency" is null or "frequency" in ('daily', 'weekly', 'monthly'));
alter table public."Shift" add constraint "shift_shift_type_enum_check" check ("shift_type" is null or "shift_type" in ('morning', 'evening', 'split', 'custom'));
alter table public."Staff" add constraint "staff_position_enum_check" check ("position" is null or "position" in ('nurse', 'receptionist', 'accountant', 'cleaner', 'assistant', 'technician', 'call_center', 'other'));
alter table public."Staff" add constraint "staff_status_enum_check" check ("status" is null or "status" in ('active', 'on_leave', 'suspended', 'resigned'));
alter table public."Staff" add constraint "staff_salary_currency_enum_check" check ("salary_currency" is null or "salary_currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Treatment" add constraint "treatment_currency_enum_check" check ("currency" is null or "currency" in ('USD', 'SYP', 'TRY', 'EUR'));
alter table public."Treatment" add constraint "treatment_status_enum_check" check ("status" is null or "status" in ('active', 'inactive'));
alter table public."User" add constraint "user_role_enum_check" check ("role" is null or "role" in ('admin', 'user'));
alter table public."User" add constraint "user_clinic_role_enum_check" check ("clinic_role" is null or "clinic_role" in ('clinic_admin', 'doctor', 'receptionist'));
alter table public."User" add constraint "user_preferred_language_enum_check" check ("preferred_language" is null or "preferred_language" in ('en', 'ar', 'tr'));
alter table public."User" add constraint "user_signup_status_enum_check" check ("signup_status" is null or "signup_status" in ('pending', 'approved', 'rejected'));
alter table public."VerificationOTP" add constraint "verificationotp_status_enum_check" check ("status" is null or "status" in ('pending', 'verified', 'expired', 'blocked'));

create index if not exists "appointment_patient_id_idx" on public."Appointment" ("patient_id");
create index if not exists "appointment_doctor_id_idx" on public."Appointment" ("doctor_id");
create index if not exists "appointment_treatment_id_idx" on public."Appointment" ("treatment_id");
create index if not exists "auditlog_record_id_idx" on public."AuditLog" ("record_id");
create index if not exists "auditlog_user_id_idx" on public."AuditLog" ("user_id");
create index if not exists "backup_external_file_id_idx" on public."Backup" ("external_file_id");
create index if not exists "clinicroleassignment_user_id_idx" on public."ClinicRoleAssignment" ("user_id");
create index if not exists "clinicroleassignment_assigned_by_id_idx" on public."ClinicRoleAssignment" ("assigned_by_id");
create index if not exists "consentform_patient_id_idx" on public."ConsentForm" ("patient_id");
create index if not exists "consentform_doctor_id_idx" on public."ConsentForm" ("doctor_id");
create index if not exists "deleteduser_user_id_idx" on public."DeletedUser" ("user_id");
create index if not exists "doctor_user_id_idx" on public."Doctor" ("user_id");
create index if not exists "doctorpayout_doctor_id_idx" on public."DoctorPayout" ("doctor_id");
create index if not exists "invoice_patient_id_idx" on public."Invoice" ("patient_id");
create index if not exists "invoice_doctor_id_idx" on public."Invoice" ("doctor_id");
create index if not exists "labcase_patient_id_idx" on public."LabCase" ("patient_id");
create index if not exists "labcase_patient_treatment_id_idx" on public."LabCase" ("patient_treatment_id");
create index if not exists "labcase_doctor_id_idx" on public."LabCase" ("doctor_id");
create index if not exists "labcase_lab_id_idx" on public."LabCase" ("lab_id");
create index if not exists "labcase_expense_id_idx" on public."LabCase" ("expense_id");
create index if not exists "messagelog_patient_id_idx" on public."MessageLog" ("patient_id");
create index if not exists "messagelog_appointment_id_idx" on public."MessageLog" ("appointment_id");
create index if not exists "messagelog_provider_message_id_idx" on public."MessageLog" ("provider_message_id");
create index if not exists "notification_user_id_idx" on public."Notification" ("user_id");
create index if not exists "patient_referring_doctor_id_idx" on public."Patient" ("referring_doctor_id");
create index if not exists "patient_assigned_doctor_id_idx" on public."Patient" ("assigned_doctor_id");
create index if not exists "patientfile_patient_id_idx" on public."PatientFile" ("patient_id");
create index if not exists "patientfile_associated_treatment_id_idx" on public."PatientFile" ("associated_treatment_id");
create index if not exists "patienttreatment_patient_id_idx" on public."PatientTreatment" ("patient_id");
create index if not exists "patienttreatment_treatment_id_idx" on public."PatientTreatment" ("treatment_id");
create index if not exists "patienttreatment_doctor_id_idx" on public."PatientTreatment" ("doctor_id");
create index if not exists "payment_patient_id_idx" on public."Payment" ("patient_id");
create index if not exists "payment_patient_treatment_id_idx" on public."Payment" ("patient_treatment_id");
create index if not exists "payment_doctor_id_idx" on public."Payment" ("doctor_id");
create index if not exists "pendingclinicdeletion_requested_by_id_idx" on public."PendingClinicDeletion" ("requested_by_id");
create index if not exists "pendingpermanentdeletion_requested_by_id_idx" on public."PendingPermanentDeletion" ("requested_by_id");
create index if not exists "reminderlog_patient_id_idx" on public."ReminderLog" ("patient_id");
create index if not exists "reminderlog_appointment_id_idx" on public."ReminderLog" ("appointment_id");
create index if not exists "restorelock_locked_by_user_id_idx" on public."RestoreLock" ("locked_by_user_id");
create index if not exists "restorelock_backup_id_idx" on public."RestoreLock" ("backup_id");
create index if not exists "scheduledreport_created_by_id_idx" on public."ScheduledReport" ("created_by_id");
create index if not exists "shift_employee_id_idx" on public."Shift" ("employee_id");
create index if not exists "staff_user_id_idx" on public."Staff" ("user_id");
create index if not exists "staff_employee_id_idx" on public."Staff" ("employee_id");
create index if not exists "staff_national_id_idx" on public."Staff" ("national_id");
create index if not exists "usersecurityprofile_user_id_idx" on public."UserSecurityProfile" ("user_id");
create index if not exists "usersecurityprofile_assigned_by_id_idx" on public."UserSecurityProfile" ("assigned_by_id");


-- Create a safe pending profile whenever a Supabase Auth account is registered.
-- Security-sensitive role and clinic membership values are deliberately NOT copied from user metadata.
create unique index if not exists "usersecurityprofile_user_id_unique" on public."UserSecurityProfile" ("user_id");
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  safe_meta jsonb;
begin
  safe_meta := jsonb_build_object(
    'full_name', coalesce(new.raw_user_meta_data->>'full_name',''),
    'phone', coalesce(new.raw_user_meta_data->>'phone',''),
    'clinic_name', coalesce(new.raw_user_meta_data->>'clinic_name',''),
    'preferred_language', case when new.raw_user_meta_data->>'preferred_language' in ('en','ar','tr') then new.raw_user_meta_data->>'preferred_language' else 'en' end
  );
  insert into public."User" (id,email,role,full_name,phone,clinic_name,signup_status,preferred_language,data,created_by_id)
  values (new.id::text,new.email,'user',safe_meta->>'full_name',safe_meta->>'phone',safe_meta->>'clinic_name','pending',safe_meta->>'preferred_language',safe_meta,new.id::text)
  on conflict (id) do update set email=excluded.email;
  insert into public."UserSecurityProfile" (user_id,signup_status,assigned_by_id,created_by_id)
  values (new.id::text,'pending','system',new.id::text)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_aura on auth.users;
create trigger on_auth_user_created_aura
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();


-- Keep updated_date consistent for writes made by the Worker and administrative jobs.
create or replace function app_private.set_updated_date()
returns trigger language plpgsql set search_path = public, pg_temp
as $$ begin new.updated_date = now(); return new; end; $$;
create trigger "appointment_set_updated_date" before update on public."Appointment" for each row execute procedure app_private.set_updated_date();
create trigger "auditlog_set_updated_date" before update on public."AuditLog" for each row execute procedure app_private.set_updated_date();
create trigger "backup_set_updated_date" before update on public."Backup" for each row execute procedure app_private.set_updated_date();
create trigger "clinic_set_updated_date" before update on public."Clinic" for each row execute procedure app_private.set_updated_date();
create trigger "clinicroleassignment_set_updated_date" before update on public."ClinicRoleAssignment" for each row execute procedure app_private.set_updated_date();
create trigger "consentform_set_updated_date" before update on public."ConsentForm" for each row execute procedure app_private.set_updated_date();
create trigger "deleteduser_set_updated_date" before update on public."DeletedUser" for each row execute procedure app_private.set_updated_date();
create trigger "doctor_set_updated_date" before update on public."Doctor" for each row execute procedure app_private.set_updated_date();
create trigger "doctorpayout_set_updated_date" before update on public."DoctorPayout" for each row execute procedure app_private.set_updated_date();
create trigger "expense_set_updated_date" before update on public."Expense" for each row execute procedure app_private.set_updated_date();
create trigger "invoice_set_updated_date" before update on public."Invoice" for each row execute procedure app_private.set_updated_date();
create trigger "labcase_set_updated_date" before update on public."LabCase" for each row execute procedure app_private.set_updated_date();
create trigger "laboratory_set_updated_date" before update on public."Laboratory" for each row execute procedure app_private.set_updated_date();
create trigger "messagelog_set_updated_date" before update on public."MessageLog" for each row execute procedure app_private.set_updated_date();
create trigger "notification_set_updated_date" before update on public."Notification" for each row execute procedure app_private.set_updated_date();
create trigger "patient_set_updated_date" before update on public."Patient" for each row execute procedure app_private.set_updated_date();
create trigger "patientfile_set_updated_date" before update on public."PatientFile" for each row execute procedure app_private.set_updated_date();
create trigger "patienttreatment_set_updated_date" before update on public."PatientTreatment" for each row execute procedure app_private.set_updated_date();
create trigger "payment_set_updated_date" before update on public."Payment" for each row execute procedure app_private.set_updated_date();
create trigger "pendingclinicdeletion_set_updated_date" before update on public."PendingClinicDeletion" for each row execute procedure app_private.set_updated_date();
create trigger "pendingpermanentdeletion_set_updated_date" before update on public."PendingPermanentDeletion" for each row execute procedure app_private.set_updated_date();
create trigger "purchase_set_updated_date" before update on public."Purchase" for each row execute procedure app_private.set_updated_date();
create trigger "reminderlog_set_updated_date" before update on public."ReminderLog" for each row execute procedure app_private.set_updated_date();
create trigger "restorelock_set_updated_date" before update on public."RestoreLock" for each row execute procedure app_private.set_updated_date();
create trigger "scheduledreport_set_updated_date" before update on public."ScheduledReport" for each row execute procedure app_private.set_updated_date();
create trigger "shift_set_updated_date" before update on public."Shift" for each row execute procedure app_private.set_updated_date();
create trigger "staff_set_updated_date" before update on public."Staff" for each row execute procedure app_private.set_updated_date();
create trigger "treatment_set_updated_date" before update on public."Treatment" for each row execute procedure app_private.set_updated_date();
create trigger "user_set_updated_date" before update on public."User" for each row execute procedure app_private.set_updated_date();
create trigger "usersecurityprofile_set_updated_date" before update on public."UserSecurityProfile" for each row execute procedure app_private.set_updated_date();
create trigger "verificationotp_set_updated_date" before update on public."VerificationOTP" for each row execute procedure app_private.set_updated_date();

-- Browser clients are intentionally not granted direct table privileges. All clinical reads/writes
-- go through the authenticated Cloudflare Worker, which derives clinic_id and enforces role rules.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
