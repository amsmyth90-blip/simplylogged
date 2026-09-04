-- Contract only after every API instance uses apply_sync_mutations_server.
revoke all on function public.apply_sync_mutations(jsonb)
from public, anon, authenticated, service_role;
