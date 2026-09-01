drop policy if exists product_analytics_events_owner_read on public.product_analytics_events;
create policy product_analytics_events_owner_read
on public.product_analytics_events for select to authenticated
using (user_id = auth.uid() and expires_at > timezone('utc', now()));
