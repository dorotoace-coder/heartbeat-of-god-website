-- Let authorised inbox reviewers save an inquiry's status, and remove table
-- rights that no screen or form uses. Public form inserts are unchanged.
begin;

revoke all privileges on table public.inquiries from anon, authenticated;
grant insert on table public.inquiries to anon, authenticated;
grant select on table public.inquiries to authenticated;
grant update (status) on table public.inquiries to authenticated;

create policy "Staff update inquiry status" on public.inquiries
 for update to authenticated
 using (public.hbg_has_staff_role(array['owner','pastor','manager']))
 with check (
  public.hbg_has_staff_role(array['owner','pastor','manager'])
  and status in ('pending','reviewed','contacted')
 );

commit;
