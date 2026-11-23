# Doroto context
Before any task, read the Doroto Brain at `~/doroto-brain/` (start with README.md, profile.md, current-state.md and the relevant file in ventures/).
Do NOT keep your own copy of business facts in this repo. If a fact is missing or wrong, append a proposal to `~/doroto-brain/INBOX.md` and tell Doroto.

Repo-specific build/test instructions go below this line only.

## Authorised development workflow
For development work Doroto requests in `dorotoace-coder/heartbeat-of-god-website`, Doroto authorises creating feature branches, committing relevant changes, pushing those branches and creating draft pull requests after checks pass. Keep private materials and secrets out of the public repository. Obtain separate approval before merging, deploying, changing production data or spending money.

## This repository is PUBLIC
- Never commit phone or device numbers, private emails, hosting or database IDs, keys or tokens, counseling or safeguarding procedures, team rosters, legal filings, finance records or internal admin URLs.
- Run `bash scripts/check-public-safe.sh` before committing. Enable the hook once per clone: `git config core.hooksPath .githooks`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
