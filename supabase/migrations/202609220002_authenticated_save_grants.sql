-- RLS continues to restrict every operation to the signed-in user's rows.
grant select, insert, update, delete on table public.saves to authenticated;

create policy "users update own saves"
on public.saves
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
