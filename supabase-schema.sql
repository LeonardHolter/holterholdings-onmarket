-- ============================================================
-- Holter Holdings – M&A Deal Pipeline CRM
-- Run this in Supabase SQL Editor (supabase.com → project → SQL)
-- ============================================================

-- 1. Brokers
create table if not exists brokers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  email       text,
  phone       text,
  last_contacted date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- 2. Deals
create table if not exists deals (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,
  industry         text,
  asking_price     numeric,
  revenue          numeric,
  ebitda_sde       numeric,
  ebitda_sde_type  text not null default 'SDE' check (ebitda_sde_type in ('SDE', 'EBITDA')),
  multiple         numeric,
  description      text,
  location         text,
  listing_url      text,
  data_room_link   text,
  cim_received_date date,
  loi_sent_date    date,
  loi_amount       numeric,
  status           text not null default 'awaiting_cim'
                     check (status in ('awaiting_cim', 'cim_received', 'loi_sent')),
  rating           text check (rating in ('bad', 'fair', 'great')),
  broker_id        uuid references brokers(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index for fast status filtering
create index if not exists idx_deals_status on deals(status);

-- Auto-update updated_at on deals
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists deals_updated_at on deals;
create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();

-- 3. Row-level security (disabled for simplicity – no auth)
alter table brokers enable row level security;
alter table deals   enable row level security;

create policy "Allow all on brokers" on brokers for all using (true) with check (true);
create policy "Allow all on deals"   on deals   for all using (true) with check (true);

-- Add rating column if running against an existing database
alter table deals add column if not exists rating text check (rating in ('bad', 'fair', 'great'));
