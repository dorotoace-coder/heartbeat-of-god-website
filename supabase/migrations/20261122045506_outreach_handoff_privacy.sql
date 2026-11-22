begin;

-- Once a follow-up has an assignee, its private contact details and notes
-- belong only to that worker and the Pastor. A visit recorder can still see
-- contacts that have no assigned follow-up.
drop policy outreach_contact_read on public.outreach_contacts;
create policy outreach_contact_read on public.outreach_contacts
  for select to authenticated using (
    public.staff_workspace() = 'pastor' or
    (public.staff_workspace() = 'evangelism' and (
      assigned_to = auth.uid() or
      (followup_date is null and exists (
        select 1 from public.outreach_visits v
        where v.id = visit_id and v.recorded_by = auth.uid()
      ))
    ))
  );

commit;
