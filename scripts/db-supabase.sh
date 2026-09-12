#!/usr/bin/env bash
# Run migrations and (optionally) the seed against Supabase rather than local.
#
#   ./scripts/db-supabase.sh migrate   apply migrations
#   ./scripts/db-supabase.sh seed      wipe and reseed
#   ./scripts/db-supabase.sh status    show what is there
#
# Migrations go over the SESSION pooler (5432) because DDL needs a session.
# The seed goes over the TRANSACTION pooler (6543), the same path the deployed
# app uses, so the seed exercises production's actual connection mode.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

: "${SUPABASE_DIRECT_URL:?SUPABASE_DIRECT_URL is not set}"
: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is not set}"

case "${1:-status}" in
  migrate)
    DIRECT_URL="$SUPABASE_DIRECT_URL" pnpm exec prisma migrate deploy
    ;;
  seed)
    DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm exec tsx prisma/seed.ts
    ;;
  status)
    DIRECT_URL="$SUPABASE_DIRECT_URL" pnpm exec prisma migrate status
    ;;
  *)
    echo "usage: $0 {migrate|seed|status}" >&2; exit 1
    ;;
esac
