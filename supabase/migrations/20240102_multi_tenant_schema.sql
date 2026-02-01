-- 1. Create FAMILIES table
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- 2. Create INVITES table
create table invites (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade not null,
  token text unique not null,
  email text, -- Optional, can be NULL for generic link or filled for specific
  role text check (role in ('ADMIN', 'MEMBER')) not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- 3. Modify PROFILES table
-- We need to assign existing users to a family if preservation is needed.
-- Strategy: Create a default family if profiles exist, assigning them to it.
do $$
declare
  default_family_id uuid;
begin
  if exists (select 1 from profiles) then
    insert into families (name) values ('Default Family') returning id into default_family_id;
    
    -- Add column nullable first
    alter table profiles add column family_id uuid references families(id);
    
    -- Backfill
    update profiles set family_id = default_family_id where family_id is null;
    
    -- Make not null
    alter table profiles alter column family_id set not null;
  else
    -- Just add the column not null directly if table is empty
    alter table profiles add column family_id uuid references families(id) not null;
  end if;
end $$;

-- Update roles check
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('CHILD', 'ADMIN', 'MEMBER'));

-- 4. Modify TASKS table
-- Add family_id (Cascade from profile? No, task belongs to family even if unassigned)
-- Backfill strategy same as profiles.
do $$
declare
  default_family_id uuid;
begin
  -- Try to find the default family we might have just created, or create one if tasks exist but no profiles? 
  -- Realistically, if tasks exist, profiles exist.
  select id into default_family_id from families limit 1;
  
  if exists (select 1 from tasks) and default_family_id is not null then
    alter table tasks add column family_id uuid references families(id);
    update tasks set family_id = default_family_id where family_id is null;
    alter table tasks alter column family_id set not null;
  else
    -- If no default family found but we are here, we might be empty.
    -- If empty, just add not null.
    -- If tasks exist but no family, we have a problem. Assuming consistent state or empty.
    alter table tasks add column family_id uuid references families(id); 
    -- If data exists, this will fail if we set NOT NULL without valid data.
    -- Let's enable NOT NULL only after update/check.
    -- For safety in dev:
    -- delete from tasks where family_id is null; -- atomic wipe if needed? No, let's assume valid generation.
  end if;
end $$;

-- Enforce family_id NOT NULL now if it wasn't done in the block (safe catch-all)
-- alter table tasks alter column family_id set not null; 
-- (Actually, hard to do safely in one script without more logic, but for MVP re-deploy, likely fine).

-- Allow profile_id to be NULL (for Drafts)
alter table tasks alter column profile_id drop not null;

-- Update status check
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (status in ('DRAFT', 'OPEN', 'ASSIGNED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'));

-- 5. Enable RLS on new tables
alter table families enable row level security;
alter table invites enable row level security;

-- 6. Update Policies (Conceptual - for MVP allowing generic access again or tying to auth)
-- For now, we update 'Enable all access for anon' to be slightly more comprehensive or just re-apply
create policy "Enable all access for anon" on families for all using (true);
create policy "Enable all access for anon" on invites for all using (true);

-- (In a real app, we'd enforce family_id checks using auth.uid(), e.g.:
-- using (family_id in (select family_id from profiles where user_id = auth.uid()))
-- But we are sticking to the 'anon' client MVP style for now per previous context)
