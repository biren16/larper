-- The existing RLS policy restricts authenticated users to their own profile.
-- This grant only lets that policy be evaluated.
grant select on table public.profiles to authenticated;
