# naano

A B2B LinkedIn creator marketplace, rebuilt in 24 hours. Brands find vetted
creators, brief them, track posts through clicks and leads to pipeline, and pay
them out. Creators build a marketplace card, accept or decline deals, post, and
get paid.

The reasoning behind every decision below is in [`docs/PLAN.md`](docs/PLAN.md):
recon of both sides, the data model with field provenance, the cut with
reasons, the build order, the stranger path, and the visual system transcribed
from naano.com's own stylesheet.

---

**Live at [naano-ashy.vercel.app](https://naano-ashy.vercel.app).**

## Try it as a stranger

Sign up with your own public LinkedIn profile URL and you get a real card in the
real marketplace grid. That is the whole point, so it is the first thing to try.

Or sign in as someone who already has history. The password is `naano-demo` for
all of them.

| Account | Side | What is waiting |
|---|---|---|
| `orbisearch@demo.naano.test` | Brand | An open campaign, three completed bookings with clicks and leads |
| `priya-shah@demo.naano.test` | Creator | A live offer with the 48-hour clock running |
| `huxley-hr@demo.naano.test` | Brand | A campaign in HR, useful for testing the matcher |

Three cached profiles are deliberately unclaimed, so a signup resolves from the
local cache with no live call: `dana-whitmore`, `theo-brennan`, `sana-iqbal`.

## The loop, end to end

1. A brand browses the marketplace, or asks the matcher for a shortlist.
2. It sends an offer: a price inside the 10/20/30 band, a post-by date, a
   campaign, and a 48-hour clock.
3. The creator accepts, counters inside their own listed price, or declines.
4. Acceptance creates a booking, issues a tracking code and holds the funds.
5. The creator posts on LinkedIn with the tracking link and submits the post URL.
6. A reader clicks the link. naano counts it and lands them on a campaign page.
7. They leave an email. naano counts a lead.
8. The brand completes the booking. The creator is credited and a payout is
   scheduled. They withdraw, and the ledger explains the balance.

A creator with no offers can start from the other end: Opportunities lists open
campaigns scored against their card, and Apply is the second door into the same
machine.

---

## The four decisions worth arguing with

**The price is derived before the creator has an opinion.** 13 cents per
follower, rounded to the nearest 5 euro, and the brand can only move it inside a
10/20/30 band. This is what makes a card bookable sixty seconds after signup,
which is what makes the supply side liquid on day one. A rate card is a blank
field in most products. Here it is the thing that solves cold start.

**A field with no data renders as an em dash next to a Pending bar.** Never a
zero, never a guess. `Metric` in `src/lib/pricing.ts` makes the bad case
unrepresentable: a number is either measured or an explicit admission that it is
not, and there is no third case. A creator's first booking is sold on followers
and price; their second is sold on measured performance. The dash is the state
before that loop closes, not a gap in the design.

**Numbers are grouped by how much they can be trusted.** The campaign dashboard
has three headings and they are not decorative. *Measured by naano*: clicks and
leads, counted through our own tracking link. *Self-reported by creators*:
views, typed in off LinkedIn, because we do not read LinkedIn and will not claim
to. *Estimated on a stated assumption*: pipeline, which is lead count times a
deal value the brand told us, with that multiplier on screen next to every total
it produces.

**Balances are sums over a ledger, never columns.** Three rows per booking: a
hold debits the brand at acceptance, an earning credits the creator at
completion, a payout debits them when they withdraw. Money in a mutable integer
is money that goes wrong on camera.

---

## What is stubbed, and why

- **The matcher.** The ranking is a deterministic scorer over topic overlap,
  region, budget and reach. No model ranks anything, so the shortlist is
  reproducible and cannot contain a creator who is not in the database. A model
  is then handed that scorer's own reasons and asked only to write them up, and
  it is held to it: a reply naming anyone outside the shortlist is discarded, so
  is one that guesses a creator's gender from their name, and a missing key, a
  timeout or the daily call cap all fall back to the template silently. The page
  says which of the two wrote the text it is showing.
- **The profile picture is copied, not linked.** LinkedIn returns a signed CDN
  URL a browser usually cannot load: the host refuses off-site requests and the
  signature expires within days, so a real signup ended up with an empty circle
  on the card they had just built. Proxying does not fix expiry, because once
  it lapses there is nothing left to proxy. The bytes are fetched
  server-to-server at import time, while the URL is still good, and served from
  our own route with a year-long immutable cache. One fetch, a five-second
  timeout, a 512KB cap, and null on any failure, which leaves the card on
  initials rather than on a broken image.
- **Campaigns and accounts.** Create and edit a campaign from the app rather
  than only as a side effect of signing up, and close or reopen one. No delete:
  a campaign owns offers, bookings, clicks, leads and ledger rows, and removing
  it would quietly take a creator's earnings with it. Both sides get a settings
  screen; the creator's carries a live preview of the card being edited, and
  the fields that came from the profile read are shown but locked, because the
  public card says in writing where they came from.
- **Messaging.** One thread per booking, both sides, with unread counts. Not a
  general inbox: a message only exists inside a deal both parties already
  agreed to, which is the whole access model and is why there is no contacts
  list, no block list and no spam surface. No realtime either — messages land
  on the next render, because claiming live delivery with a poll would be the
  same kind of lie as an estimated impression count.
- **Payments.** No Stripe. A wallet top-up writes a ledger row and a payout flips
  a status. The money model is the thing worth judging and the ledger shows it
  completely; a redirect and a webhook would show nothing new.
- **Views.** Self-reported by the creator, labelled as such on every screen that
  shows them.
- **Pipeline value.** Lead count times a per-campaign assumed deal value, with
  the multiplier visible.
- **Bundles.** Creators define one and cards show the pill. Booking a bundle as
  a multi-post contract is not wired: it multiplies every state in the booking
  machine by n for one extra tile.
- **Brand onboarding.** A real form that produces a real campaign with a real
  brief. The generation that pre-fills it in the reference product is not here.
- **Demo counterparties.** Two creators and one brand answer automatically so
  one visitor can walk the whole loop alone. Labelled on the row itself, every
  time, never in a footnote.

## What is deliberately absent

- **The content approval loop**, and with it the "approve before publishing"
  checkbox on the offer modal. Three states in the booking machine and two
  screens, for ninety seconds of video that moves no number. The states stay in
  the schema so the hour that restores it is not also an hour of schema work.
- **Profile ownership verification.** Nothing stops someone pasting a profile
  that is not theirs. The honest fixes are an OAuth handshake or a verification
  post and both are out of scope for 24 hours, so creators carry an `unverified`
  state, no card shows a verified badge, and this is the first thing I would
  build next. Claiming to have solved it would be worse than leaving it open.
- **Password reset, and email of any kind.** No provider, no sending domain, no
  deliverability problem at 3am. A stranger who forgets their password makes a
  second account.
- **The Deal Link and the 25% referral share.** The best business idea in the
  product and it produces nothing visible inside five minutes: it pays out months
  later and has no state either side can watch.
- **EN/FR toggle, multi-network, the MCP connector, notifications,
  teams and seats, invoice PDFs, disputes, the vetting queue, multi-currency.**
  Each is real surface. None is on the line from search to bank balance.

## What a stranger will find rough

Written down here before anyone else finds it. There is no password reset.
Nobody verifies that the profile you pasted is yours. View counts are the
creator's own figure. Pipeline value is lead count times a stated assumption.
The matcher is a scorer with a template rather than a model. Every one of those
is a decision above with a reason attached.

---

## Running it

```bash
docker start naano-pg          # Postgres on 5434
pnpm install
cp .env.example .env           # fill in DATABASE_URL and SESSION_SECRET
pnpm exec prisma migrate dev
pnpm seed                      # 26 creators, 4 brands, history with clicks and leads
pnpm dev
```

Other commands:

```bash
pnpm profiles                  # regenerate data/cached-profiles.json
pnpm probe <linkedin-url>      # exercise the importer chain from the CLI
./scripts/db-supabase.sh seed  # reseed the deployed database
pnpm build && pnpm lint
```

Deployment notes, including the Supabase connection gotcha that costs an hour if
you meet it cold, are in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## The profile importer

One interface, three tiers, selected automatically rather than by a flag.

1. **Cache.** The URL is normalised to a slug and looked up in `ProfileImport`.
   A hit resolves in about 130ms behind a deliberate reading state.
2. **Live.** A miss calls the profile service server-side for the five consented
   fields by name, with a four-second timeout, and writes the result back into
   the cache so any profile is only ever read once.
3. **Manual.** A timeout or an unknown profile falls through to typing the five
   fields in by hand. The card fills in live from what is typed and the import
   row records the failure. A failed import is a slower signup, never a dead end.

The service allows 150 calls a day, shared, and does not cache repeats. The app
caps itself at 40 live calls a day, rate limits per IP, and dedupes claimed
profiles. An unmetered import endpoint on a public URL is the one thing in this
build that can generate a bill overnight.

The consent sentence names five fields and disclaims three, and
`ProfileImport.fieldsUsed` stores them explicitly, which is what makes the
promise checkable rather than decorative.

## Stack

Next.js 16 with Server Functions, React 19, TypeScript, Tailwind v4, Prisma 7 on
Postgres, deployed on Vercel against Supabase. Two things are real HTTP
endpoints rather than Server Functions, and both for the same reason: the
tracking redirect is hit by a stranger's browser, and the profile import must
stay server-only so the service key never reaches a client.

No component library. The marketplace card is the product's signature, it
renders in five places from one component, and no registry component was going
to produce it.
