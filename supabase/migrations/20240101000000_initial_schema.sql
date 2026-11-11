-- Yatra: Full schema migration
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ─── PROFILES ───
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  upi_vpa text, -- for UPI payments
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view any profile"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── TRIPS ───
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image_url text,
  start_date date,
  end_date date,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trips_invite_code on public.trips(invite_code);

alter table public.trips enable row level security;

create policy "Trip members can view their trips"
  on public.trips for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create trips"
  on public.trips for insert
  with check (auth.uid() = created_by);

create policy "Trip organizer can update trip"
  on public.trips for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

create policy "Trip organizer can delete trip"
  on public.trips for delete
  using (auth.uid() = created_by);

-- ─── TRIP MEMBERS ───
create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table public.trip_members enable row level security;

create policy "Trip members can view membership"
  on public.trip_members for select
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "Users can join trips (insert)"
  on public.trip_members for insert
  with check (auth.uid() = user_id);

create policy "Organizer can remove members"
  on public.trip_members for delete
  using (
    exists (
      select 1 from public.trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'organizer'
    )
    or auth.uid() = user_id -- users can leave
  );

-- ─── TICKETS ───
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  pnr text not null,
  train_number text not null,
  train_name text not null,
  from_station text not null,
  from_station_name text not null,
  to_station text not null,
  to_station_name text not null,
  boarding_date date not null,
  journey_class text not null,
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "Trip members can view tickets"
  on public.tickets for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = tickets.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Trip members can add tickets"
  on public.tickets for insert
  with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.trip_members
      where trip_members.trip_id = tickets.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Ticket adder or organizer can delete"
  on public.tickets for delete
  using (
    auth.uid() = added_by
    or exists (
      select 1 from public.trip_members
      where trip_members.trip_id = tickets.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

-- ─── PNR STATUS HISTORY ───
create table public.pnr_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  pnr text not null,
  status_data jsonb not null,
  checked_at timestamptz not null default now()
);

create index idx_pnr_history_ticket on public.pnr_status_history(ticket_id, checked_at desc);

alter table public.pnr_status_history enable row level security;

create policy "Trip members can view PNR history"
  on public.pnr_status_history for select
  using (
    exists (
      select 1 from public.tickets t
      join public.trip_members tm on tm.trip_id = t.trip_id
      where t.id = pnr_status_history.ticket_id
        and tm.user_id = auth.uid()
    )
  );

-- Service role can insert (edge function)
create policy "Service can insert PNR history"
  on public.pnr_status_history for insert
  with check (true); -- Edge function uses service role

-- ─── ITINERARY ITEMS ───
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  order_index int not null default 0,
  type text not null check (type in ('travel', 'stay', 'activity', 'meal', 'note')),
  title text not null,
  description text,
  start_time time,
  end_time time,
  location text,
  metadata jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.itinerary_items enable row level security;

create policy "Trip members can view itinerary"
  on public.itinerary_items for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = itinerary_items.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Organizer can manage itinerary"
  on public.itinerary_items for insert
  with check (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = itinerary_items.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

create policy "Organizer can update itinerary"
  on public.itinerary_items for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = itinerary_items.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

create policy "Organizer can delete itinerary items"
  on public.itinerary_items for delete
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = itinerary_items.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

-- ─── EXPENSES ───
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  amount bigint not null check (amount > 0), -- paise
  currency text not null default 'INR',
  category text not null check (category in (
    'food', 'transport', 'stay', 'tickets', 'shopping', 'activities', 'other'
  )),
  paid_by uuid not null references public.profiles(id),
  split_type text not null check (split_type in ('equal', 'exact', 'percentage', 'shares')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "Trip members can view expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = expenses.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Trip members can add expenses"
  on public.expenses for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.trip_members
      where trip_members.trip_id = expenses.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Expense creator can update"
  on public.expenses for update
  using (auth.uid() = created_by);

create policy "Expense creator or organizer can delete"
  on public.expenses for delete
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.trip_members
      where trip_members.trip_id = expenses.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'organizer'
    )
  );

-- ─── EXPENSE SHARES ───
create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount >= 0), -- paise
  unique (expense_id, user_id)
);

alter table public.expense_shares enable row level security;

create policy "Trip members can view expense shares"
  on public.expense_shares for select
  using (
    exists (
      select 1 from public.expenses e
      join public.trip_members tm on tm.trip_id = e.trip_id
      where e.id = expense_shares.expense_id
        and tm.user_id = auth.uid()
    )
  );

create policy "Expense creator can manage shares"
  on public.expense_shares for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_shares.expense_id
        and e.created_by = auth.uid()
    )
  );

create policy "Expense creator can delete shares"
  on public.expense_shares for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_shares.expense_id
        and e.created_by = auth.uid()
    )
  );

-- ─── SETTLEMENTS ───
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user uuid not null references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0), -- paise
  settled_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  check (from_user != to_user)
);

alter table public.settlements enable row level security;

create policy "Trip members can view settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = settlements.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "Involved users can create settlements"
  on public.settlements for insert
  with check (
    auth.uid() in (from_user, to_user)
    and exists (
      select 1 from public.trip_members
      where trip_members.trip_id = settlements.trip_id
        and trip_members.user_id = auth.uid()
    )
  );

-- ─── DEVICE TOKENS ───
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  device_name text,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

alter table public.device_tokens enable row level security;

create policy "Users can view own tokens"
  on public.device_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens"
  on public.device_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

-- ─── FUNCTIONS ───

-- Find trip by invite code (for join flow)
create or replace function public.join_trip_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  select id into v_trip_id
  from public.trips
  where invite_code = upper(code);

  if v_trip_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- Check if already a member
  if exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = auth.uid()
  ) then
    return v_trip_id; -- already a member, just return
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'member');

  return v_trip_id;
end;
$$;

-- Get trip balances (aggregated for the Money tab)
create or replace function public.get_trip_balances(p_trip_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_paid bigint,
  total_share bigint,
  net_balance bigint
)
language sql
security definer
set search_path = ''
as $$
  with paid as (
    select paid_by as uid, coalesce(sum(amount), 0) as total
    from public.expenses
    where trip_id = p_trip_id
    group by paid_by
  ),
  shares as (
    select es.user_id as uid, coalesce(sum(es.amount), 0) as total
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
    where e.trip_id = p_trip_id
    group by es.user_id
  ),
  settled_out as (
    select from_user as uid, coalesce(sum(amount), 0) as total
    from public.settlements
    where trip_id = p_trip_id
    group by from_user
  ),
  settled_in as (
    select to_user as uid, coalesce(sum(amount), 0) as total
    from public.settlements
    where trip_id = p_trip_id
    group by to_user
  ),
  members as (
    select tm.user_id as uid
    from public.trip_members tm
    where tm.trip_id = p_trip_id
  )
  select
    m.uid as user_id,
    p.display_name,
    p.avatar_url,
    coalesce(pd.total, 0)::bigint as total_paid,
    coalesce(sh.total, 0)::bigint as total_share,
    (coalesce(pd.total, 0) - coalesce(sh.total, 0)
     + coalesce(so.total, 0) - coalesce(si.total, 0))::bigint as net_balance
  from members m
  join public.profiles p on p.id = m.uid
  left join paid pd on pd.uid = m.uid
  left join shares sh on sh.uid = m.uid
  left join settled_out so on so.uid = m.uid
  left join settled_in si on si.uid = m.uid;
$$;

-- ─── REALTIME ───
-- Enable realtime for key tables
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.pnr_status_history;
alter publication supabase_realtime add table public.itinerary_items;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_shares;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.trip_members;

-- ─── UPDATED_AT TRIGGER ───
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.itinerary_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.device_tokens
  for each row execute function public.set_updated_at();

-- ─── PG_CRON: Schedule PNR polling every 30 minutes ───
-- The edge function will determine per-ticket whether to actually poll
-- based on boarding date proximity.
select cron.schedule(
  'poll-pnr-status',
  '*/30 * * * *',
  $$select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/poll-pnr',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
