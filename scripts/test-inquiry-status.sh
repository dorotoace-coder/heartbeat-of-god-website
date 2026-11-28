#!/usr/bin/env bash
# Runs the synthetic inquiry permission checks in a throwaway database.
# Usage: PG_CONTAINER=<local postgres container> bash scripts/test-inquiry-status.sh
set -euo pipefail
container="${PG_CONTAINER:?Set PG_CONTAINER to a local Postgres container}"
db="inquiry_status_test_$$"
root="$(cd "$(dirname "$0")/.." && pwd)"
trap 'docker exec "$container" psql -U postgres -qc "drop database if exists $db with (force)" >/dev/null' EXIT
docker exec "$container" psql -U postgres -qc "create database $db"
docker exec "$container" mkdir -p /tmp/inq/tests/inquiries /tmp/inq/supabase/migrations
docker cp "$root/tests/inquiries/status.sql" "$container:/tmp/inq/tests/inquiries/status.sql"
docker cp "$root/supabase/migrations/." "$container:/tmp/inq/supabase/migrations/"
docker exec "$container" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 -f /tmp/inq/tests/inquiries/status.sql 2>&1 |
 sed -n 's/.*NOTICE:  \(PASS\)/\1/p;/ERROR/p'
