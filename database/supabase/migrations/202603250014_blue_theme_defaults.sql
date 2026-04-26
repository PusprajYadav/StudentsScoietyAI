-- Student Society: enforce blue-first defaults for community accents

ALTER TABLE public.communities
  ALTER COLUMN hero_color SET DEFAULT '#2563eb';

UPDATE public.communities
SET hero_color = '#2563eb'
WHERE hero_color IN ('#0f766e', '#0f8fa5', '#14a5ae', '#0ea5ae');
