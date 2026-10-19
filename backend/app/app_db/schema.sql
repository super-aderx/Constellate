-- The app database's schema. Idempotent: `python -m app.app_db init` runs it on every call.

create schema if not exists app;

-- Campaign proposals from Constella AI (mock seed for now) and where each one is in its lifecycle.
create table if not exists app.campaigns (
  campaign_id    uuid primary key default gen_random_uuid(),
  tenant_key     text not null,  -- platform.tenants.tenant_key in the warehouse, e.g. 'harbor-street'
  title          text not null check (length(title) between 1 and 120),
  -- The proposal's products as it was made: [{"sku": "HS-COFFEE", "name": "Ground Coffee"}, ...]
  products       jsonb not null
                 check (jsonb_typeof(products) = 'array' and jsonb_array_length(products) >= 1),
  slogan         text not null,
  discount_pct   smallint not null check (discount_pct between 1 and 100),
  discount_code  text not null,
  target_segment text not null,  -- a display label, e.g. 'Morning regulars'
  status         text not null default 'proposed'
                 check (status in ('proposed', 'active', 'closed')),
  source         text not null default 'constella-ai',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_key, discount_code)
);

create index if not exists campaigns_tenant_created on app.campaigns (tenant_key, created_at desc);
