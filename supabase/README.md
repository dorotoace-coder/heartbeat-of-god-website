# HBOG local Supabase foundation

This directory is the authoritative, version-controlled database contract for
the HBOG website. It is designed to run entirely on the local Mac without a
hosted Supabase project or paid branching.

## Verify everything locally

Requirements: Docker, Supabase CLI, Node.js, and the pinned npm dependencies.

```bash
npm ci
npm run verify:local-staging
npm run types:supabase:local
npm run lint
npx tsc --noEmit
```

The verifier resets only the isolated local database, applies all migrations
and seed data, runs database linting, injects a synthetic permissive policy to
prove the final migration removes drift, checks the exact policy and privilege
manifest, and uses synthetic users to verify Auth, Data API grants, and RLS. It
never contacts or mutates a hosted Supabase project.

## Run the application against the local stack

Start the local services and inspect their generated local values:

```bash
supabase start
supabase status -o env
```

Create an ignored `.env.local` with the local `API_URL` as
`NEXT_PUBLIC_SUPABASE_URL` and the local `ANON_KEY` as
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never place a service-role or secret key in a
`NEXT_PUBLIC_` variable.

Without both public values, the site deliberately disables database-backed
features, keeps the autonomous public content available, blocks Auth and form
submissions, and avoids placeholder network calls.

## Security contract

- Public users can read sermons, events, pulse, and departments.
- Public inquiry submissions are insert-only.
- Public donation submissions are insert-only and must remain `pending`.
- Managers and above can manage events and create or update sermons.
- Only pastors and owners can delete sermons.
- Managers and above can read inquiries and update only their status.
- Browser code never receives a service-role or secret key.

Every checkout or transfer notice must first create a pending donation record.
Payment completion must eventually be performed by a trusted, verified
server-side webhook. A browser callback or redirect is not payment proof.
