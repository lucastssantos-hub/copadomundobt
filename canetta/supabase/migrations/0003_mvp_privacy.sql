create or replace function public.canetta_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null then
    raise exception 'authentication required';
  end if;

  delete from auth.users where id = requesting_user;
end;
$$;

revoke all on function public.canetta_delete_my_account() from public;
grant execute on function public.canetta_delete_my_account() to authenticated;
