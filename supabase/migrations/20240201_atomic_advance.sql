-- Create atomic function for adding an advance
-- Usage: supabase.rpc('add_advance', { p_child_id: 'uuid', p_amount: 50, p_memo: 'Advance', p_category: 'Other' })

create or replace function add_advance(
  p_child_id uuid,
  p_amount numeric,
  p_memo text,
  p_category text
) returns void as $$
begin
  -- 1. Insert into ledger (Negative amount for spending/advance)
  insert into ledger (profile_id, family_id, amount, memo, type, category)
  select 
    p_child_id,
    family_id,
    -p_amount, -- NEGATIVE value
    p_memo,
    'ADVANCE',
    p_category
  from profiles
  where id = p_child_id;

  -- 2. Decrement balance in profiles
  update profiles
  set balance = balance - p_amount
  where id = p_child_id;

end;
$$ language plpgsql;
