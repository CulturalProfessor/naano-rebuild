# Deploying

## The Supabase connection gotcha

The connection string the Supabase dashboard shows first is the **direct**
one:

```
postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
```

That host has **no A record**. It resolves to IPv6 only:

```
$ dig +short A  db.<ref>.supabase.co     # (nothing)
$ dig +short AAAA db.<ref>.supabase.co
2406:da1a:82a:9d01:...
```

Vercel's serverless functions have no IPv6 egress, so this URL cannot work in
production. It also fails from any machine or CI runner without IPv6, which is
how it was caught here.

Use the **pooler** host instead. It is IPv4, and the username gains the project
ref:

| Purpose | Port | Mode | User |
|---|---|---|---|
| The app | 6543 | transaction | `postgres.<ref>` |
| Migrations | 5432 | session | `postgres.<ref>` |

Migrations need port 5432: DDL needs a real session and transaction-mode
pooling will not run it. The app runs on 6543 with `pgbouncer=true`, which
stops Prisma using prepared statements that transaction mode cannot hold.

Both are verified working for this project on `aws-0-ap-south-1`.

## Vercel environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **6543** transaction pooler URL, with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | the **5432** session pooler URL (only needed if migrations run in CI) |
| `LINKEDIN_API` | `https://linkedin-profile-api-e7e2.onrender.com/profile` |
| `LINKEDIN_API_KEY` | leave empty while the deployment reports `api_key_required: false` |
| `SESSION_SECRET` | a fresh random string, not the development one |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Managing the Supabase database from here

```bash
./scripts/db-supabase.sh status    # what is applied
./scripts/db-supabase.sh migrate   # apply migrations (session pooler)
./scripts/db-supabase.sh seed      # wipe and reseed (transaction pooler)
```

The seed deliberately runs over the transaction pooler, the same connection
mode the deployed app uses, so it exercises production's real path rather than
a friendlier one.

## Profile service quota

The service allows 150 calls a day, shared across everyone using that
deployment, and it does **not** cache repeats: the same profile fetched twice
costs twice. One creator signup costs 3.

The app therefore caps itself at `GLOBAL_LIVE_CALLS_PER_DAY = 40` in
`src/lib/profile-importer.ts` and writes every live read back into its own
cache, so a second visitor to the same profile costs nothing. Past the cap,
signup falls back to manual entry rather than failing.
