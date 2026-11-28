#!/usr/bin/env bash
# Runs the synthetic program directory checks in throwaway databases.
# Usage: PG_CONTAINER=<local postgres container> bash scripts/test-program-directory.sh
set -euo pipefail
container="${PG_CONTAINER:?Set PG_CONTAINER to a local Postgres container}"
prefix="program_directory_test_$$"
root="$(cd "$(dirname "$0")/.." && pwd)"
databases=()
cleanup() {
 for db in ${databases[@]+"${databases[@]}"}; do
  docker exec "$container" psql -U postgres -qc "drop database if exists $db with (force)" >/dev/null
 done
}
trap cleanup EXIT
docker exec "$container" mkdir -p /tmp/pdt/tests/program-directory /tmp/pdt/supabase/migrations
docker cp "$root/tests/program-directory/." "$container:/tmp/pdt/tests/program-directory/"
docker cp "$root/supabase/migrations/." "$container:/tmp/pdt/supabase/migrations/"

run() { # database name, test file, extra psql arguments
 local db="${prefix}_$1" file="$2"; shift 2
 databases+=("$db")
 docker exec "$container" psql -U postgres -qc "create database $db"
 echo "== ${db#"${prefix}_"}"
 docker exec "$container" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 "$@" -f "/tmp/pdt/tests/program-directory/$file" 2>&1 |
  sed -n 's/.*NOTICE:  \(PASS\)/\1/p;/ERROR/p'
}

run matching matching.sql
run link_fresh followup-link.sql
run link_existing followup-link.sql -v precreate=1

# Two simultaneous saves for one contact: the second must be refused with HB001.
db="${prefix}_link_fresh"
call() { echo "set role authenticated; select public.t_as(1,'pastor'); select public.t_create($1,'k-race','Di Race');"; }
docker exec "$container" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 -c "begin; $(call 301) select pg_sleep(3); commit;" >/dev/null &
first=$!
sleep 1
second="$(docker exec "$container" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -c "$(call 302)" 2>&1 || true)"
wait "$first"
count="$(docker exec "$container" psql -U postgres -d "$db" -Atc "select count(*) from public.ministry_followup_requests where directory_import_key='k-race'")"
if [[ "$second" == *HB001* && "$count" == 1 ]]; then
 echo "PASS: simultaneous saves leave one follow-up (HB001 for the second)"
else
 echo "FAIL: simultaneous saves (rows=$count) $second"; exit 1
fi
