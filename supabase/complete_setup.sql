-- ============================================================
-- JAL KHOJ (Yatra) - Complete Database Schema & Functions
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Enable Extensions
create extension if not exists "pgcrypto";

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null default '',
  display_name text not null default '',
  avatar_url text,
  upi_vpa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure default admin traveler exists
insert into public.profiles (id, email, display_name)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin@jalkhoj.app',
  'Lead Traveler'
)
on conflict (id) do update set display_name = 'Lead Traveler';

-- 3. TRIPS TABLE
create table if not exists public.trips (
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

create index if not exists idx_trips_invite_code on public.trips(invite_code);

-- 4. TRIP MEMBERS
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists idx_trip_members_trip on public.trip_members(trip_id);
create index if not exists idx_trip_members_user on public.trip_members(user_id);

-- 5. TICKETS
create table if not exists public.tickets (
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
  journey_class text not null default '3A',
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tickets_trip on public.tickets(trip_id);
create index if not exists idx_tickets_pnr on public.tickets(pnr);

-- 6. PNR STATUS HISTORY
create table if not exists public.pnr_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  pnr text not null,
  current_status text not null,
  status_data jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists idx_pnr_history_ticket on public.pnr_status_history(ticket_id);
create index if not exists idx_pnr_history_pnr on public.pnr_status_history(pnr);

-- 7. ITINERARY ITEMS
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number int not null default 1,
  order_index int not null default 0,
  type text not null default 'activity' check (type in ('train', 'activity', 'food', 'stay', 'note')),
  title text not null,
  description text,
  start_time text,
  end_time text,
  location text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_itinerary_trip_day on public.itinerary_items(trip_id, day_number);

-- 8. EXPENSES
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  amount bigint not null, -- amount in paise
  currency text not null default 'INR',
  category text not null default 'food' check (category in ('train', 'food', 'stay', 'activity', 'travel', 'other')),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  split_type text not null default 'equal' check (split_type in ('equal', 'exact', 'percentage', 'shares')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_trip on public.expenses(trip_id);

-- 9. EXPENSE SHARES
create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null, -- amount in paise
  unique (expense_id, user_id)
);

create index if not exists idx_expense_shares_exp on public.expense_shares(expense_id);
create index if not exists idx_expense_shares_user on public.expense_shares(user_id);

-- 10. SETTLEMENTS
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  payee_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  currency text not null default 'INR',
  transaction_ref text,
  settled_at timestamptz not null default now()
);

create index if not exists idx_settlements_trip on public.settlements(trip_id);

-- 11. DEVICE TOKENS (Push Notifications)
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies for zero-failure operation
-- ============================================================

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.tickets enable row level security;
alter table public.pnr_status_history enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;
alter table public.device_tokens enable row level security;

-- Drop existing if any to avoid duplicates
drop policy if exists "Allow all on profiles" on public.profiles;
create policy "Allow all on profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Allow all on trips" on public.trips;
create policy "Allow all on trips" on public.trips for all using (true) with check (true);

drop policy if exists "Allow all on trip_members" on public.trip_members;
create policy "Allow all on trip_members" on public.trip_members for all using (true) with check (true);

drop policy if exists "Allow all on tickets" on public.tickets;
create policy "Allow all on tickets" on public.tickets for all using (true) with check (true);

drop policy if exists "Allow all on pnr_status_history" on public.pnr_status_history;
create policy "Allow all on pnr_status_history" on public.pnr_status_history for all using (true) with check (true);

drop policy if exists "Allow all on itinerary_items" on public.itinerary_items;
create policy "Allow all on itinerary_items" on public.itinerary_items for all using (true) with check (true);

drop policy if exists "Allow all on expenses" on public.expenses;
create policy "Allow all on expenses" on public.expenses for all using (true) with check (true);

drop policy if exists "Allow all on expense_shares" on public.expense_shares;
create policy "Allow all on expense_shares" on public.expense_shares for all using (true) with check (true);

drop policy if exists "Allow all on settlements" on public.settlements;
create policy "Allow all on settlements" on public.settlements for all using (true) with check (true);

drop policy if exists "Allow all on device_tokens" on public.device_tokens;
create policy "Allow all on device_tokens" on public.device_tokens for all using (true) with check (true);

-- ============================================================
-- STORED FUNCTIONS & RPCs
-- ============================================================

-- Function: Join trip by invite code
create or replace function public.join_trip_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_user_id uuid;
begin
  select id into v_trip_id
  from public.trips
  where upper(invite_code) = upper(code);

  if v_trip_id is null then
    raise exception 'Invalid invite code';
  end if;

  v_user_id := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);

  -- Check if already a member
  if exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = v_user_id
  ) then
    return v_trip_id;
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_user_id, 'member')
  on conflict do nothing;

  return v_trip_id;
end;
$$;

-- Function: Calculate trip balances for the Money tab
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
as $$
  with
  paid as (
    select paid_by as uid, sum(amount) as total
    from public.expenses
    where trip_id = p_trip_id
    group by paid_by
  ),
  shares as (
    select es.user_id as uid, sum(es.amount) as total
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
    where e.trip_id = p_trip_id
    group by es.user_id
  ),
  settled_out as (
    select payer_id as uid, sum(amount) as total
    from public.settlements
    where trip_id = p_trip_id
    group by payer_id
  ),
  settled_in as (
    select payee_id as uid, sum(amount) as total
    from public.settlements
    where trip_id = p_trip_id
    group by payee_id
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

-- Enable Realtime
do $$
begin
  alter publication supabase_realtime add table public.tickets;
  alter publication supabase_realtime add table public.pnr_status_history;
  alter publication supabase_realtime add table public.itinerary_items;
  alter publication supabase_realtime add table public.expenses;
  alter publication supabase_realtime add table public.expense_shares;
  alter publication supabase_realtime add table public.settlements;
  alter publication supabase_realtime add table public.trip_members;
exception when others then null;
end $$;
