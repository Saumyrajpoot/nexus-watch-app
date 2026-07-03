-- 1. Create the 'devices' table (Links your ESP32 to your Google Account)
create table devices (
  token uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create the 'events' table (Stores your meetings, notes, and presentations)
create table events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- 'meeting', 'note', 'presentation'
  title text,
  time timestamp with time zone,
  duration_mins integer,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS) so users only see their own data
alter table devices enable row level security;
alter table events enable row level security;

-- 4. Create Security Policies
create policy "Users can view own devices" on devices for select using (auth.uid() = user_id);
create policy "Users can insert own devices" on devices for insert with check (auth.uid() = user_id);
create policy "Users can view own events" on events for select using (auth.uid() = user_id);
create policy "Users can insert own events" on events for insert with check (auth.uid() = user_id);
create policy "Users can delete own events" on events for delete using (auth.uid() = user_id);
