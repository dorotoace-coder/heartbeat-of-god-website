#!/usr/bin/env bash
# Runs the synthetic program directory checks in a throwaway database.
# Usage: PG_CONTAINER=<local postgres container> bash scripts/test-program-directory.sh
set -euo pipefail
container="${PG_CONTAINER:?Set PG_CONTAINER to a local Postgres container}"
db="program_directory_test_$$"
root="$(cd "$(dirname "$0")/.." && pwd)"
docker exec "$container" psql -U postgres -qc "create database $db"
trap 'docker exec "$container" psql -U postgres -qc "drop database if exists $db" >/dev/null' EXIT
docker exec "$container" mkdir -p /tmp/pdt/tests/program-directory /tmp/pdt/supabase/migrations
docker cp "$root/tests/program-directory/matching.sql" "$container:/tmp/pdt/tests/program-directory/matching.sql"
docker cp "$root/supabase/migrations/20261128060000_program_directory_review_evidence.sql" "$container:/tmp/pdt/supabase/migrations/"
docker exec "$container" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 -f /tmp/pdt/tests/program-directory/matching.sql 2>&1 | sed -n 's/.*NOTICE:  //p;/ERROR/p'
