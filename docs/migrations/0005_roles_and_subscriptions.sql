-- Maelio — rôles et abonnements (fondation, sans paiement)
-- Déjà appliquée sur la base Lovable Cloud le 2026-10-17 ; fichier à ajouter dans drizzle/migrations/
-- pour garder le dépôt synchronisé. Idempotente : peut être rejouée sans erreur.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
drop policy if exists "Lecture de ses roles" on public.user_roles;
create policy "Lecture de ses roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  provider text not null check (provider in ('admin_grant', 'stripe', 'apple', 'google')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
drop policy if exists "Lecture de son abonnement" on public.subscriptions;
create policy "Lecture de son abonnement" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() = _user_id or coalesce(auth.role(), '') = 'service_role')
    and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.is_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() = _user_id or coalesce(auth.role(), '') = 'service_role')
    and exists (
      select 1 from public.subscriptions
      where user_id = _user_id and plan = 'premium' and status = 'active'
        and (current_period_end is null or current_period_end > now())
    )
$$;
revoke execute on function public.is_premium(uuid) from public, anon;
grant execute on function public.is_premium(uuid) to authenticated, service_role;
