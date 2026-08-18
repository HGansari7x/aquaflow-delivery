-- AquaFlow Delivery Phase 1 schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('OWNER','AGENT','CUSTOMER');
create type public.order_status as enum ('PENDING','ASSIGNED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  owner_id uuid references public.owners(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_identity check (
    (role='OWNER' and owner_id is not null and agent_id is null and customer_id is null)
    or (role='AGENT' and agent_id is not null and customer_id is null)
    or (role='CUSTOMER' and customer_id is not null and agent_id is null)
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  agent_id uuid references public.agents(id) on delete set null,
  product text not null default '20L Water Bottle',
  quantity integer not null check (quantity > 0),
  delivery_address text not null,
  latitude double precision,
  longitude double precision,
  status public.order_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz
);

create index orders_owner_id_idx on public.orders(owner_id);
create index orders_agent_id_idx on public.orders(agent_id);
create index orders_customer_id_idx on public.orders(customer_id);

-- Helper functions for RLS. SECURITY DEFINER avoids recursive policy evaluation.
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create or replace function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select owner_id from public.profiles where id = auth.uid() $$;

alter table public.businesses enable row level security;
alter table public.owners enable row level security;
alter table public.agents enable row level security;
alter table public.customers enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());

create policy "owner sees own owner" on public.owners for select using (id = public.current_owner_id());

create policy "owner manages own agents" on public.agents for all
using (owner_id = public.current_owner_id())
with check (owner_id = public.current_owner_id());

create policy "owner manages own customers" on public.customers for all
using (owner_id = public.current_owner_id())
with check (owner_id = public.current_owner_id());

create policy "customer reads self" on public.customers for select
using (id = (select customer_id from public.profiles where id = auth.uid()));

create policy "owner sees own orders" on public.orders for select
using (owner_id = public.current_owner_id());

create policy "agent sees assigned orders" on public.orders for select
using (agent_id = (select agent_id from public.profiles where id = auth.uid()));

create policy "customer sees own orders" on public.orders for select
using (customer_id = (select customer_id from public.profiles where id = auth.uid()));

create policy "customer creates own orders" on public.orders for insert
with check (
  customer_id = (select customer_id from public.profiles where id = auth.uid())
  and owner_id = (select owner_id from public.customers where id = customer_id)
  and status = 'PENDING'
);

create policy "owner updates own orders" on public.orders for update
using (owner_id = public.current_owner_id())
with check (owner_id = public.current_owner_id());

create policy "agent updates assigned orders" on public.orders for update
using (agent_id = (select agent_id from public.profiles where id = auth.uid()))
with check (agent_id = (select agent_id from public.profiles where id = auth.uid()));

-- Realtime
alter publication supabase_realtime add table public.orders;
