create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create policy "admins view all submissions" on public.submissions for select to authenticated using (public.is_admin());
create policy "admins moderate submissions" on public.submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
