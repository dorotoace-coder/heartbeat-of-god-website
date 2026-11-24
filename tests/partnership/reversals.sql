set role service_role;
select public.apply_partnership_payment('evt_receipt_refund',50,'10000000-0000-4000-8000-000000000002','cus_demo','sub_demo','active','invoice:in_refund',25,'CAD','pi_demo');
select public.sync_partnership_reversal('evt_refund',51,'pi_demo',10,null);
select public.sync_partnership_reversal('evt_refund',51,'pi_demo',10,null);
select public.sync_partnership_reversal('evt_dispute',52,'pi_demo',null,true);
select public.test_assert((select refunded_amount=10 and disputed from public.partnership_gifts where payment_intent_id='pi_demo'),'Refund/dispute not recorded');
-- A refund timestamp must not suppress an independently ordered dispute outcome.
select public.sync_partnership_reversal('evt_later_refund',100,'pi_demo',10,null);
select public.sync_partnership_reversal('evt_won',60,'pi_demo',null,false);
select public.sync_partnership_reversal('evt_old_dispute',53,'pi_demo',null,true);
select public.test_assert((select refunded_amount=10 and not disputed from public.partnership_gifts where payment_intent_id='pi_demo'),'Old dispute overwrote outcome');
select public.test_denied($q$select public.sync_partnership_reversal('evt_bad_refund',70,'pi_demo',30,null)$q$);
reset role;set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.test_denied($q$select public.sync_partnership_reversal('evt_forged',80,'pi_demo',0,false)$q$);
reset role;
select 'PASS: partial refunds, reversal deduplication, disputes, won disputes, stale reversal protection, bounded refunds and reversal role isolation';
