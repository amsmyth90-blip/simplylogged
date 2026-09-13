-- Grocery batches and reminders are private to the signed-in account.
create table public.grocery_batches (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, payload jsonb not null, primary key(user_id,id)
);
create table public.grocery_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, name text not null check(length(name) between 1 and 120),
 quantity text not null default '' check(length(quantity)<=80),
 date date, date_type text not null check(date_type in ('use-by','best-before','unknown')),
 date_text text not null default '' check(length(date_text)<=160),
 time_zone text not null, used_at timestamptz, created_at timestamptz not null default now(),
 primary key(user_id,id), check(date is null or date_type <> 'unknown')
);
create table public.grocery_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 item_id uuid not null, device_id uuid not null references public.appointment_devices(id) on delete cascade,
 offset_days integer not null check(offset_days in (1,2)), due_at timestamptz not null,
 expires_at timestamptz not null, status text not null default 'pending'
 check(status in ('pending','sending','sent','cancelled','failed')),
 attempts integer not null default 0, lease_until timestamptz, sent_at timestamptz,
 foreign key(user_id,item_id) references public.grocery_items(user_id,id) on delete cascade,
 unique(user_id,item_id,device_id,offset_days)
);
create index grocery_due on public.grocery_notifications(due_at) where status in ('pending','sending');
alter table public.grocery_batches enable row level security;
alter table public.grocery_batches force row level security;
alter table public.grocery_items enable row level security;
alter table public.grocery_items force row level security;
alter table public.grocery_notifications enable row level security;
alter table public.grocery_notifications force row level security;
revoke all on public.grocery_batches,public.grocery_items,public.grocery_notifications from public,anon,authenticated;
grant all on public.grocery_batches,public.grocery_items,public.grocery_notifications to service_role;
grant select on public.grocery_items to authenticated;
create policy groceries_owner_read on public.grocery_items for select to authenticated using(user_id=auth.uid());

create function public.save_grocery_batch(input_user_id uuid,input_batch_id uuid,input_items jsonb,input_time_zone text)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare existing jsonb; value jsonb; item public.grocery_items%rowtype;
 offset_days integer; scheduled timestamptz; source_at timestamptz; reminder public.reminders%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
 if input_user_id is null or input_batch_id is null or input_items is null or jsonb_typeof(input_items)<>'array'
 or jsonb_array_length(input_items) not between 1 and 40 or pg_column_size(input_items)>40000
 or not exists(select 1 from pg_timezone_names where name=input_time_zone) then raise exception 'Invalid batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(input_user_id::text,739));
 select payload into existing from public.grocery_batches where user_id=input_user_id and id=input_batch_id;
 if found then
   if existing is distinct from jsonb_build_object('items',input_items,'zone',input_time_zone) then raise exception 'Batch changed'; end if;
   return;
 end if;
 if (select count(*) from public.grocery_items where user_id=input_user_id and used_at is null)+jsonb_array_length(input_items)>300 then
   raise exception 'Active grocery limit reached'; end if;
 for value in select * from jsonb_array_elements(input_items) loop
   if jsonb_typeof(value)<>'object' or (select count(*) from jsonb_object_keys(value))<>6
   or not (value ?& array['id','name','quantity','date','dateType','dateText'])
   or coalesce(value->>'name','')='' then raise exception 'Invalid product'; end if;
   insert into public.grocery_items(user_id,id,name,quantity,date,date_type,date_text,time_zone)
   values(input_user_id,(value->>'id')::uuid,value->>'name',value->>'quantity',nullif(value->>'date','')::date,
     value->>'dateType',value->>'dateText',input_time_zone) returning * into item;
   if item.date is not null then
     source_at := (item.date+time '08:00') at time zone input_time_zone;
     foreach offset_days in array array[2,1] loop
       scheduled := ((item.date-offset_days)+time '08:00') at time zone input_time_zone;
       -- Do not send stale notifications for windows already passed.
       if scheduled > now() then
         reminder := jsonb_populate_record(null::public.reminders,jsonb_build_object(
           'id',gen_random_uuid(),'user_id',input_user_id,'scope_kind','USER','scope_id',input_user_id,
           'title',item.name || ' — ' || replace(item.date_type,'-',' ') || ' in ' || offset_days || ' day' || case when offset_days=1 then '' else 's' end,
           'note','Check the package label. Open Groceries to mark this item used up.',
           'room_id','kitchen','room_name','Kitchen','reminder_group','later','priority','normal',
           'time_label',to_char(scheduled at time zone input_time_zone,'DD Mon YYYY HH24:MI'),
           'due_at',scheduled,'source_due_at',source_at,'time_zone',input_time_zone,'origin','SYSTEM_GENERATED',
           'reminder_type','grocery_expiry','source_resource_type','grocery','source_resource_id',item.id,
           'source_date_key','expiry','rule_id','grocery-expiry','rule_version',1,
           'schedule_offset_days',offset_days,'dedupe_key','grocery:'||item.id||':'||offset_days));
         insert into public.reminders(id,user_id,scope_kind,scope_id,title,note,room_id,room_name,
           reminder_group,priority,time_label,due_at,source_due_at,time_zone,origin,reminder_type,
           source_resource_type,source_resource_id,source_date_key,rule_id,rule_version,schedule_offset_days,dedupe_key)
         values(reminder.id,reminder.user_id,reminder.scope_kind,reminder.scope_id,reminder.title,reminder.note,
           reminder.room_id,reminder.room_name,reminder.reminder_group,reminder.priority,reminder.time_label,
           reminder.due_at,reminder.source_due_at,reminder.time_zone,reminder.origin,reminder.reminder_type,
           reminder.source_resource_type,reminder.source_resource_id,reminder.source_date_key,reminder.rule_id,
           reminder.rule_version,reminder.schedule_offset_days,reminder.dedupe_key);
       end if;
     end loop;
   end if;
 end loop;
 insert into public.grocery_batches values(input_user_id,input_batch_id,jsonb_build_object('items',input_items,'zone',input_time_zone));
end $$;
revoke all on function public.save_grocery_batch(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_grocery_batch(uuid,uuid,jsonb,text) to service_role;

create function public.use_grocery_item(input_user_id uuid,input_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(input_user_id::text,739));
 update public.grocery_items set used_at=coalesce(used_at,now()) where user_id=input_user_id and id=input_id;
 if not found then raise exception 'Product not found'; end if;
 update public.reminders set reminder_group='done' where user_id=input_user_id
   and source_resource_type='grocery' and source_resource_id=input_id::text;
 update public.grocery_notifications set status='cancelled',lease_until=null where user_id=input_user_id
   and item_id=input_id and status in ('pending','sending');
end $$;
revoke all on function public.use_grocery_item(uuid,uuid) from public,anon,authenticated;
grant execute on function public.use_grocery_item(uuid,uuid) to service_role;

create function public.claim_grocery_notifications()
returns setof public.grocery_notifications language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
 -- Only currently registered devices receive alerts; no media or product names on lock screens.
 insert into public.grocery_notifications(user_id,item_id,device_id,offset_days,due_at,expires_at)
 select g.user_id,g.id,d.id,r.schedule_offset_days,r.due_at,r.due_at+interval '20 hours'
 from public.grocery_items g join public.reminders r on r.user_id=g.user_id
   and r.source_resource_type='grocery' and r.source_resource_id=g.id::text
 join public.appointment_devices d on d.user_id=g.user_id and d.updated_at>now()-interval '90 days'
 where g.used_at is null and r.reminder_group<>'done' and r.due_at<=now() and r.due_at>now()-interval '20 hours'
 on conflict do nothing;
 update public.grocery_notifications set status='cancelled',lease_until=null
 where status in ('pending','sending') and expires_at<=now();
 update public.grocery_notifications set status='failed',lease_until=null
 where status='sending' and lease_until<now() and attempts>=8;
 return query update public.grocery_notifications set status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes'
 where id in(select id from public.grocery_notifications where attempts<8 and due_at<=now()
   and (status='pending' or (status='sending' and lease_until<now()))
   order by due_at for update skip locked limit 20) returning *;
end $$;
revoke all on function public.claim_grocery_notifications() from public,anon,authenticated;
grant execute on function public.claim_grocery_notifications() to service_role;
