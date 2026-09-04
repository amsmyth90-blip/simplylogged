-- Save one revision-checked Office bill and its linked document metadata atomically.
create or replace function public.apply_mobile_bill_state(
  input_expected_revision timestamptz,
  input_payload jsonb,
  input_document jsonb default null
)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  state_row public.app_state%rowtype;
  document_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if input_payload is null or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid application state';
  end if;

  if input_document is not null then
    if jsonb_typeof(input_document) <> 'object'
      or not (input_document ?& array['id', 'title', 'provider', 'dueDate'])
      or exists (
        select 1 from jsonb_object_keys(input_document) as key
        where key <> all (array['id', 'title', 'provider', 'dueDate'])
      )
      or length(input_document ->> 'id') > 128
      or trim(input_document ->> 'id') = ''
      or length(input_document ->> 'title') > 160
      or trim(input_document ->> 'title') = ''
      or length(input_document ->> 'provider') > 160
      or length(input_document ->> 'dueDate') > 10
      or (input_document ->> 'dueDate' <> ''
        and input_document ->> 'dueDate' !~ '^\d{4}-\d{2}-\d{2}$') then
      raise exception 'Invalid linked document update';
    end if;
  end if;

  if input_expected_revision is null then
    insert into public.app_state (id, payload)
    values (current_user_id::text, input_payload)
    on conflict (id) do nothing
    returning * into state_row;
  else
    update public.app_state
    set payload = input_payload
    where id = current_user_id::text and updated_at = input_expected_revision
    returning * into state_row;
  end if;
  if state_row.id is null then return; end if;

  if input_document is not null then
    document_id := input_document ->> 'id';
    update public.documents
    set title = input_document ->> 'title',
      issuer = nullif(trim(input_document ->> 'provider'), ''),
      due_date = nullif(input_document ->> 'dueDate', ''),
      review_status = 'reviewed',
      reviewed_at = timezone('utc', now())::text,
      updated_at = timezone('utc', now())
    where id = document_id and user_id = current_user_id;
  end if;

  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_bill_state(timestamptz, jsonb, jsonb)
from public, anon;
grant execute on function public.apply_mobile_bill_state(timestamptz, jsonb, jsonb)
to authenticated;
