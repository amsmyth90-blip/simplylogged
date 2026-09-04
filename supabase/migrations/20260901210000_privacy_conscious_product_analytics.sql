create table if not exists public.product_analytics_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  consented_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'signup_completed', 'onboarding_completed', 'first_home_added', 'first_vehicle_added',
    'first_pet_added', 'first_document_added', 'first_scan_completed', 'first_reminder_created',
    'first_guardian_action', 'first_household_invite', 'household_invite_accepted',
    'first_nfc_link', 'first_ai_question', 'organisation_score_viewed', 'vault_setup_completed',
    'return_session', 'subscription_started'
  )),
  event_key text not null,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '90 days',
  unique(user_id, event_name, event_key)
);

create index if not exists product_analytics_events_expiry_idx on public.product_analytics_events(expires_at);
create index if not exists product_analytics_events_user_time_idx on public.product_analytics_events(user_id, occurred_at desc);

alter table public.product_analytics_preferences enable row level security;
alter table public.product_analytics_events enable row level security;

drop policy if exists product_analytics_preferences_owner_read on public.product_analytics_preferences;
create policy product_analytics_preferences_owner_read on public.product_analytics_preferences for select to authenticated
using (user_id = auth.uid());
drop policy if exists product_analytics_events_owner_read on public.product_analytics_events;
create policy product_analytics_events_owner_read on public.product_analytics_events for select to authenticated
using (user_id = auth.uid());

revoke all on public.product_analytics_preferences, public.product_analytics_events from anon, authenticated;
grant select on public.product_analytics_preferences, public.product_analytics_events to authenticated;

create or replace function public.set_product_analytics_consent(input_enabled boolean)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  insert into public.product_analytics_preferences(user_id, enabled, consented_at, revoked_at)
  values (
    current_user_id,
    coalesce(input_enabled, false),
    case when coalesce(input_enabled, false) then timezone('utc', now()) else null end,
    case when coalesce(input_enabled, false) then null else timezone('utc', now()) end
  )
  on conflict(user_id) do update set
    enabled = excluded.enabled,
    consented_at = case when excluded.enabled then coalesce(public.product_analytics_preferences.consented_at, excluded.consented_at) else public.product_analytics_preferences.consented_at end,
    revoked_at = excluded.revoked_at,
    updated_at = timezone('utc', now());
  if not coalesce(input_enabled, false) then
    delete from public.product_analytics_events where user_id = current_user_id;
  end if;
  return coalesce(input_enabled, false);
end;
$$;

create or replace function public.record_product_analytics_event(input_event_name text, input_properties jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  clean_properties jsonb := coalesce(input_properties, '{}'::jsonb);
  dedupe_key text;
  allowed_keys text[] := array[]::text[];
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.product_analytics_preferences where user_id = current_user_id and enabled = true) then return false; end if;
  if input_event_name not in (
    'signup_completed', 'onboarding_completed', 'first_home_added', 'first_vehicle_added',
    'first_pet_added', 'first_document_added', 'first_scan_completed', 'first_reminder_created',
    'first_guardian_action', 'first_household_invite', 'household_invite_accepted',
    'first_nfc_link', 'first_ai_question', 'organisation_score_viewed', 'vault_setup_completed',
    'return_session', 'subscription_started'
  ) then raise exception 'Unknown analytics event'; end if;
  if jsonb_typeof(clean_properties) <> 'object' then raise exception 'Analytics properties must be an object'; end if;

  allowed_keys := case input_event_name
    when 'first_document_added' then array['source']
    when 'first_scan_completed' then array['source']
    when 'first_reminder_created' then array['origin']
    when 'first_guardian_action' then array['action']
    when 'first_nfc_link' then array['resourceType']
    when 'first_ai_question' then array['surface']
    when 'organisation_score_viewed' then array['scoreBand']
    when 'vault_setup_completed' then array['clientType']
    when 'subscription_started' then array['planTier']
    else '{}'::text[]
  end;
  if exists (select 1 from jsonb_object_keys(clean_properties) key where not (key = any(allowed_keys))) then
    raise exception 'Analytics property is not allowed';
  end if;
  if exists (select 1 from jsonb_each(clean_properties) item where jsonb_typeof(item.value) not in ('string', 'number', 'boolean', 'null')) then
    raise exception 'Nested analytics properties are not allowed';
  end if;

  if input_event_name in ('first_document_added', 'first_scan_completed') and clean_properties->>'source' not in ('MANUAL', 'CAPTURE', 'IMPORT', 'EMAIL', 'SHARE') then raise exception 'Invalid analytics source'; end if;
  if input_event_name = 'first_reminder_created' and clean_properties->>'origin' not in ('USER', 'SYSTEM') then raise exception 'Invalid reminder origin'; end if;
  if input_event_name = 'first_guardian_action' and clean_properties->>'action' not in ('OPEN', 'RESOLVE', 'DISMISS', 'SNOOZE') then raise exception 'Invalid Guardian action'; end if;
  if input_event_name = 'first_nfc_link' and clean_properties->>'resourceType' <> 'ASSET' then raise exception 'Invalid Physical Link resource'; end if;
  if input_event_name = 'first_ai_question' and clean_properties->>'surface' <> 'ASK' then raise exception 'Invalid AI surface'; end if;
  if input_event_name = 'organisation_score_viewed' and clean_properties->>'scoreBand' not in ('0_24', '25_49', '50_74', '75_100') then raise exception 'Invalid score band'; end if;
  if input_event_name = 'vault_setup_completed' and clean_properties->>'clientType' <> 'NATIVE' then raise exception 'Invalid Vault client'; end if;
  if input_event_name = 'subscription_started' and clean_properties->>'planTier' not in ('FREE', 'PLUS', 'FAMILY') then raise exception 'Invalid plan tier'; end if;

  dedupe_key := case
    when input_event_name like 'first_%' or input_event_name in ('signup_completed', 'onboarding_completed', 'vault_setup_completed') then 'ONCE'
    when input_event_name = 'subscription_started' then clean_properties->>'planTier'
    else to_char(timezone('utc', now()), 'YYYY-MM-DD')
  end;

  delete from public.product_analytics_events where expires_at <= timezone('utc', now());
  insert into public.product_analytics_events(user_id, event_name, event_key, properties)
  values (current_user_id, input_event_name, dedupe_key, clean_properties)
  on conflict(user_id, event_name, event_key) do nothing;
  return true;
end;
$$;

revoke all on function public.set_product_analytics_consent(boolean) from public;
revoke all on function public.record_product_analytics_event(text,jsonb) from public;
grant execute on function public.set_product_analytics_consent(boolean) to authenticated;
grant execute on function public.record_product_analytics_event(text,jsonb) to authenticated;
