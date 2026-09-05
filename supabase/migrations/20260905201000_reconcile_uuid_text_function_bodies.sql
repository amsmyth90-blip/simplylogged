-- Reconcile functions installed before documents.id and reminders.id were normalised.
-- Fresh databases already contain these definitions, so each replacement is idempotent.
do $migration$
declare
  targets regprocedure[] := array[
    'public.apply_document_sync_mutation(uuid,jsonb)'::regprocedure,
    'public.apply_mobile_office_state(uuid,timestamptz,jsonb,text,jsonb)'::regprocedure,
    'public.decide_action_request_server(uuid,uuid,text)'::regprocedure,
    'public.apply_reminder_sync_mutation(uuid,jsonb)'::regprocedure,
    'public.apply_reminder_sync_mutation(uuid,jsonb)'::regprocedure
  ];
  old_fragments text[] := array[
    'where id = current_record.source_id and user_id = current_user_id;',
    'where id = document_id and user_id = input_user_id;',
    'where documents.id = source_document_id',
    'where documents.id = document_id',
    $$payload ->> 'priority',payload ->> 'repeat',document_id,$$
  ];
  new_fragments text[] := array[
    'where id::text = current_record.source_id and user_id = current_user_id;',
    'where id::text = document_id and user_id = input_user_id;',
    'where documents.id::text = source_document_id',
    'where documents.id::text = document_id',
    $$payload ->> 'priority',payload ->> 'repeat',document_id::uuid,$$
  ];
  definition text;
  position_index integer;
begin
  for position_index in 1..array_length(targets, 1) loop
    definition := pg_get_functiondef(targets[position_index]);
    if position(old_fragments[position_index] in definition) > 0 then
      execute replace(
        definition,
        old_fragments[position_index],
        new_fragments[position_index]
      );
      continue;
    end if;
    if position(new_fragments[position_index] in definition) = 0 then
      raise exception 'Unexpected definition for %', targets[position_index];
    end if;
  end loop;
end;
$migration$;
