-- RLS decides which rows are visible; these grants let public clients reach
-- the explicitly public read surfaces at all.
grant select on table public.niches, public.media_assets, public.stories to anon, authenticated;

-- The Row Level Security policies created in 202609200001 and
-- 202609200002 still decide exactly which rows are visible.
grant select on table public.cluster_signals, public.raw_signals to anon, authenticated;
