-- Route legacy Office mutations through one server-only, revision-checked boundary.
create or replace function public.apply_mobile_office_state(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_payload jsonb,
  input_document_kind text,
  input_document jsonb default null
)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  state_row public.app_state%rowtype;
  document_id text;
  document_issuer text;
  document_due_date text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_payload is null or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid application state';
  end if;
  if input_document_kind not in ('bill', 'insurance', 'contract', 'correspondence') then
    raise exception 'Invalid Office document kind';
  end if;

  if input_document is not null then
    if jsonb_typeof(input_document) <> 'object' then
      raise exception 'Invalid linked document update';
    end if;
    if input_document_kind = 'correspondence' then
      if not (input_document ?& array['id', 'title', 'sender', 'deadline'])
        or exists (
          select 1 from jsonb_object_keys(input_document) as key
          where key <> all (array['id', 'title', 'sender', 'deadline'])
        ) then
        raise exception 'Invalid linked document update';
      end if;
      document_issuer := input_document ->> 'sender';
      document_due_date := input_document ->> 'deadline';
    else
      if not (input_document ?& array['id', 'title', 'provider', 'dueDate'])
        or exists (
          select 1 from jsonb_object_keys(input_document) as key
          where key <> all (array['id', 'title', 'provider', 'dueDate'])
        ) then
        raise exception 'Invalid linked document update';
      end if;
      document_issuer := input_document ->> 'provider';
      document_due_date := input_document ->> 'dueDate';
    end if;
    if length(input_document ->> 'id') > 128
      or trim(input_document ->> 'id') = ''
      or length(input_document ->> 'title') > 160
      or trim(input_document ->> 'title') = ''
      or length(document_issuer) > 160
      or length(document_due_date) > 10
      or (document_due_date <> '' and document_due_date !~ '^\d{4}-\d{2}-\d{2}$') then
      raise exception 'Invalid linked document update';
    end if;
  end if;

  if input_expected_revision is null then
    insert into public.app_state (id, payload)
    values (input_user_id::text, input_payload)
    on conflict (id) do nothing
    returning * into state_row;
  else
    update public.app_state as state
    set payload = input_payload
    where state.id = input_user_id::text
      and state.updated_at = input_expected_revision
    returning state.* into state_row;
  end if;
  if state_row.id is null then return; end if;

  if input_document is not null then
    document_id := input_document ->> 'id';
    update public.documents
    set title = input_document ->> 'title',
      issuer = nullif(trim(document_issuer), ''),
      due_date = nullif(document_due_date, ''),
      review_status = 'reviewed',
      reviewed_at = timezone('utc', now())::text,
      updated_at = timezone('utc', now())
    where id = document_id and user_id = input_user_id;
  end if;

  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_office_state(
  uuid, timestamptz, jsonb, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_mobile_office_state(
  uuid, timestamptz, jsonb, text, jsonb
) to service_role;

revoke all on function public.apply_mobile_bill_state(timestamptz, jsonb, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.apply_mobile_insurance_state(timestamptz, jsonb, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.apply_mobile_contract_state(timestamptz, jsonb, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.apply_mobile_correspondence_state(timestamptz, jsonb, jsonb)
from public, anon, authenticated, service_role;
