#!/usr/bin/env bash
# check-public-safe.sh — keeps private data out of markdown in this PUBLIC repo.
#
# Runs in:  .githooks/pre-commit   (enable once per clone: git config core.hooksPath .githooks)
#           .github/workflows/public-safe.yml   (every push and pull request)
# Manual:   bash scripts/check-public-safe.sh
#
# False positive? Put the marker  public-safe-ok  anywhere on that line.
# Matches are reported by file and line only. The matched text is never printed,
# because CI logs on a public repo are public too.

set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 2

# "label|regex" — split on the FIRST "|" only. Portable ERE (no \b) for macOS + Linux.
RULES=(
  "phone number|(\+?234[ .-]?[0-9]{3}[ .-]?[0-9]{3}[ .-]?[0-9]{4})|(^|[^0-9])0[789][01][0-9]{8}([^0-9]|$)|(^|[^0-9])\(?[2-9][0-9]{2}\)?[ .-][0-9]{3}[ .-][0-9]{4}([^0-9]|$)"
  "hosting project/team ID|(prj|team)_[A-Za-z0-9]{16,}"
  "database project ref|(^|[^A-Za-z0-9_])[a-z]{20}([^A-Za-z0-9_]|$)"
  "JWT or database key|eyJ[A-Za-z0-9_-]{20,}"
  "API secret or token|(sk|rk)_(live|test)_[A-Za-z0-9]{8,}|(^|[^A-Za-z0-9])re_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}"
  "server-only key name|service_role"
)

# Public addresses that may appear in docs.
ALLOW_EMAIL='^(heartbeatofgodf@gmail\.com|noreply@heartbeatofgod\.ca|[^@]+@example\.(com|org|net))$'
EMAIL_RE='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'

fail=0
count=0

while IFS= read -r f; do
  [ -f "$f" ] || continue
  count=$((count + 1))

  for rule in "${RULES[@]}"; do
    label="${rule%%|*}"
    regex="${rule#*|}"
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      case "$hit" in *public-safe-ok*) continue ;; esac
      echo "✖ $f:${hit%%:*} — $label"
      fail=1
    done < <(grep -nE -- "$regex" "$f" 2>/dev/null)
  done

  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    lineno="${hit%%:*}"
    email="${hit#*:}"
    case "$(sed -n "${lineno}p" "$f")" in *public-safe-ok*) continue ;; esac
    if ! printf '%s\n' "$email" | grep -qiE "$ALLOW_EMAIL"; then
      echo "✖ $f:$lineno — private email address"
      fail=1
    fi
  done < <(grep -noE -- "$EMAIL_RE" "$f" 2>/dev/null)
done < <(git ls-files -co --exclude-standard -- '*.md' '*.mdx' 'docs' 2>/dev/null | sort -u)

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Public-safe check FAILED. This repo is public: move that content to the private context, then retry."
  exit 1
fi

echo "✔ Public-safe check passed ($count markdown/docs files scanned)"
