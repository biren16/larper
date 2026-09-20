-- Members may edit a display name, never their authorization role.
drop policy if exists "users update their profile" on public.profiles;
revoke update on public.profiles from authenticated;
grant update(display_name) on public.profiles to authenticated;

create policy "users update their display name"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
