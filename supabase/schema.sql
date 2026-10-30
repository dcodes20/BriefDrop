create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text not null,
  description text not null,
  difficulty text not null,
  duration text not null,
  accent text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.saved_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brief_id uuid not null references public.briefs (id) on delete cascade,
  status text not null default 'saved'
    check (status in ('saved', 'in_progress', 'completed')),
  reflection text not null default ''
    check (char_length(reflection) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_id)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  note text not null default ''
    check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index saved_briefs_user_updated_idx
  on public.saved_briefs (user_id, updated_at desc);
create index journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc);

alter table public.briefs enable row level security;
alter table public.saved_briefs enable row level security;
alter table public.journal_entries enable row level security;

create policy "Anyone can read briefs"
  on public.briefs for select
  to anon, authenticated
  using (true);

create policy "Users can read their own saved briefs"
  on public.saved_briefs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save their own briefs"
  on public.saved_briefs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own saved briefs"
  on public.saved_briefs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own saved briefs"
  on public.saved_briefs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own journal"
  on public.journal_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own journal"
  on public.journal_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id and entry_date <= current_date);

create policy "Users can update their own journal"
  on public.journal_entries for update
  to authenticated
  using ((select auth.uid()) = user_id and entry_date <= current_date)
  with check ((select auth.uid()) = user_id and entry_date <= current_date);

create policy "Users can remove their own journal entries"
  on public.journal_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.briefs to anon, authenticated;
grant select, insert, update, delete on public.saved_briefs to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;

insert into public.briefs
  (slug, title, category, summary, description, difficulty, duration, accent, sort_order)
values
  (
    'fintech-workflow',
    'Fintech app design.',
    'UI/UX DESIGN',
    'You’ll own the design of our core workflow, the part of the product where users spend 80% of their time and where most of our drop-off happens.',
    'A fintech startup helps young adults build a savings habit, but its transfer flow feels confusing and easy to abandon. Design the core savings workflow, from choosing a goal through confirming a transfer. Show how people understand their balance, recover from a mistake, and feel confident before money moves. Start with a short flow and the key screens; choose the details that best tell your design story.',
    'Intermediate',
    '3–5 hours',
    'design',
    1
  ),
  (
    'five-story-hooks',
    'One story. Five hooks.',
    'WRITING',
    'Turn a tiny everyday moment into five opening lines that make people want to read on.',
    'Choose a small moment from an ordinary day: a missed train, a burnt breakfast, or an unexpected message. Write five genuinely different opening lines for a short personal story. Try a question, a surprising detail, a confession, a strong point of view, and one format of your choice. Pick your strongest hook and add a few sentences showing where the story might go.',
    'Beginner friendly',
    '30–45 minutes',
    'writing',
    2
  ),
  (
    'fresh-photo-angle',
    'Find your fresh angle.',
    'VISUAL STORYTELLING',
    'Take three photos of one object. Change the light, the crop, and the story it tells.',
    'Pick an everyday object and make three photos that tell three different stories about it. Change your point of view, light, framing, or surroundings for each shot. Give the images a short title and note the visual choice that changed their meaning. A phone camera and available light are plenty.',
    'Beginner friendly',
    '20–30 minutes',
    'visual',
    3
  )
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  description = excluded.description,
  difficulty = excluded.difficulty,
  duration = excluded.duration,
  accent = excluded.accent,
  sort_order = excluded.sort_order;
