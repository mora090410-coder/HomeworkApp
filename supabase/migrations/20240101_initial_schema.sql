-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Children and potentially parents)
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pin_hash text, -- Stored securely (e.g. bcrypt) for Edge Function verification
  grade_level text,
  balance numeric(10, 2) default 0.00,
  avatar_url text, 
  role text default 'CHILD', -- 'CHILD' or 'PARENT'
  
  -- Storing structured data as JSONB for flexibility (matching current app flexibility)
  subjects jsonb default '[]'::jsonb, 
  rates jsonb default '{}'::jsonb,
  
  created_at timestamptz default now()
);

-- TASKS (Active assignments)
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  baseline_minutes integer default 15,
  status text check (status in ('OPEN', 'ASSIGNED', 'PENDING_APPROVAL', 'PENDING_PAYMENT')) default 'ASSIGNED',
  rejection_comment text,
  created_at timestamptz default now()
);

-- LEDGER (Transaction History - Immutable)
create table ledger (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  amount numeric(10, 2) not null,
  memo text not null,
  type text check (type in ('EARNING', 'ADVANCE')) not null,
  category text, -- 'Food/Drinks', etc.
  created_at timestamptz default now()
);

-- RLS POLICIES (Simple for MVP: Public read/write or Service Role for specific parts)
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table ledger enable row level security;

-- For this MVP, we might allow public access or restrict based on application logic
-- Assuming "Service Role" or strict client checks.
-- For now, allowing generic access to get started:
create policy "Enable all access for anon" on profiles for all using (true);
create policy "Enable all access for anon" on tasks for all using (true);
create policy "Enable all access for anon" on ledger for all using (true);

-- RPC: PAY_TASK (Atomic Transaction)
-- Call this from the client to ensure Ledger + Balance + Task removal happen together
create or replace function pay_task(
  p_child_id uuid,
  p_task_id uuid,
  p_amount numeric,
  p_memo text
) returns void as $$
begin
  -- 1. Insert into Ledger
  insert into ledger (profile_id, amount, memo, type)
  values (p_child_id, p_amount, p_memo, 'EARNING');

  -- 2. Update Balance
  update profiles
  set balance = balance + p_amount
  where id = p_child_id;

  -- 3. Delete Task (or mark as archived/paid if we had a status for it)
  -- The app currently deletes open tasks upon payment
  delete from tasks
  where id = p_task_id;
end;
$$ language plpgsql;
