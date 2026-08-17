-- Correct the two vendor feeds that did not answer.
--
-- The first real poll came back `unknown` for stripe and sendgrid. Both were URLs
-- I assumed rather than checked — the other six I had actually curled, these two
-- I filled in by pattern.
--
--   stripe   — status.stripe.com/api/v2/status.json is a 404; the Statuspage
--              instance lives at www.stripestatus.com. Worth fixing rather than
--              dropping: Stripe is the blueprint's own example of the dependency
--              whose outage should collapse forty client incidents into one.
--   sendgrid — has no reachable Statuspage feed at any of status.sendgrid.com,
--              sendgrid.status.io. It is a Twilio product now and Twilio's feed,
--              already in the registry, is the one that answers.
--
-- Worth noting what did NOT happen: an unreachable feed was recorded as
-- `unknown`, and `unknown` does not suppress. A wrong URL therefore failed safe
-- — it left alerting fully on. Had it defaulted to `none`, these two would have
-- silently disabled dependency suppression for every asset depending on them.

update public.vendor_status
   set status_url = 'https://www.stripestatus.com/api/v2/status.json',
       indicator  = 'unknown',   -- re-checked on the next poll, minutes away
       updated_at = now()
 where provider = 'stripe';

-- Only if nobody has come to depend on it; the foreign key would refuse anyway,
-- and failing a migration over a seed row would be a silly way to lose a deploy.
delete from public.vendor_status v
 where v.provider = 'sendgrid'
   and not exists (select 1 from public.asset_dependencies d where d.provider = v.provider);
