# naano rebuild — 24 hour plan

Written from two recorded walkthroughs: 6 brand screens and 9 creator screens, read in
timestamp order. Everything quoted below was read off a screen. Anything I could not see
is marked **[inferred]** and says what it is inferred from.

---

## 0. Two things before the plan

### The load-bearing decision that is easy to miss

**The creator's price is computed by naano before the creator has an opinion, and the
brand can only move it inside a fixed band.**

Read off step 4 of creator onboarding: the price field is pre-filled at €315 under a
heading that says "OUR RECOMMENDATION" and the body text "Naano recommends this starting
price from the public audience and performance information currently available. You can
change it now or later." The creator in the recon had 2,438 followers. €315 / 2,438 =
€0.129 per follower.

Read off the brand's negotiate modal: the brand does not type a number first. It picks
from 10% / 20% / 30% off the listed price, and only then gets an "Other" escape hatch.
The helper text under the field is "The creator will see a 20% discount request."

Those two screens are the same decision seen from both ends. It solves the cold-start
problem that kills creator marketplaces: a brand-new creator with no campaign history is
still bookable within sixty seconds of signup, because the price does not wait for
evidence. And it caps the negotiation at a band narrow enough that neither side has to
think about it, so the marketplace stays transactional instead of turning into a DM
thread. A rate card is a blank field in most products. Here it is the thing that makes
the supply side liquid on day one.

The corollary is the part that is even easier to miss. On the same card, "Est.
impressions" renders as an em dash, and a bar labelled "Data" sits empty next to the word
"Pending". Followers and price are populated; the metric that needs post history is not,
and naano refuses to guess it. A price can be derived from followers honestly. An
impression count cannot. Getting this wrong in either direction breaks the product: fake
the impressions and brands stop trusting the marketplace, leave the price blank and there
is no marketplace to browse.

Runner-up, and I want it on the record even though I am cutting it: the Deal Link. The
creator studio offers "Copy or share my Deal Link" with "YOUR SHARE 25%" and "REWARD
PERIOD 3 months", under the line "Put it on LinkedIn. Earn when a brand joins through
it." naano pays for demand-side acquisition out of creator commission and turns every
creator into a salesperson. That is a business model decision, not a screen. It is
absent from this build for demo reasons given in section 3, not because it is minor.

### The question I asked, and the answer

I asked whether a stranger has to be able to hit the live URL, paste their own LinkedIn
profile and get a real card, or whether a seeded demo login would do. The answer is the
stranger. That is the harder case and it changes this plan in five places. Recorded here
so the changes downstream are traceable:

1. **Accounts stop being theatre.** Real sign-in, real sessions, real ownership checks on
   every query. This moves out of the stubbed list and into the build, at hour three.
2. **The real importer runs on the live path.** The seeded importer stops being what the
   demo runs on and becomes the first tier of a resolution chain, which lets both of your
   constraints hold at once. Details in section 5.
3. **Cold start becomes a design problem.** A stranger who signs up as a creator and lands
   in an empty studio has seen a card builder, not a marketplace. Section 6 is new and is
   the answer to that.
4. **An abuse surface appears.** Strangers paste garbage URLs, claim profiles that are not
   theirs, and every signup spends one call against your service. Three constraints in
   section 2.1 exist only because of this.
5. **Roughly five hours move into plumbing**, and my stated order of sacrifice inverts.
   Opportunities and Apply were first on the chopping block and are now untouchable: they
   are the only thing a brand-new creator with no offers can actually do.

The end-to-end milestone slips from hour nine to hour ten and a half. That is the honest
price of real auth and I would rather show it here than discover it at hour twenty.

---

## 1. Recon

### 1.1 Creator side

Nine screens, in the order I moved through them.

**S0 — Role picker.** `naano.com/register`. "Create your account / First, who are you
here as?" Two cards: "I'm a creator — Get paid to create LinkedIn content for B2B brands
you actually use" and "I'm a brand — Find creators, launch campaigns, and trace real
pipeline back to each post." Right panel: "One platform. Two sides."

*Doing:* self-identifying. *State:* nothing yet; role becomes a query param
(`?role=influencer` for creators, `?role=saas` for brands) and later a column on the
account.

**S1 — Step 1 of 4.** Not captured. **[inferred]** from the step counter and the presence
of an authenticated account by step 2: email and password or an email-first identity
step.

**S2 — Step 2 of 4: "Add your public LinkedIn profile".** The screen the brief says to get
right, and the one I agree matters most.

Layout is a two-pane split. Left is the form, right is a live card preview under the
heading "YOUR MARKETPLACE CARD / Build a card brands can trust." with the subtitle "It
updates live with your profile, analytics, positioning and price."

Left pane, in order:
- Back link: "Back to my account"
- "STEP 2 OF 4"
- Title: "Add your public LinkedIn profile"
- Body: "No extension is needed. We'll retrieve only the minimum public information
  required to create your Basic card."
- Label: "PUBLIC LINKEDIN PROFILE URL", value `https://www.linkedin.com/in/sp35`
- Consent block, with a shield icon, verbatim: **"By clicking below, you authorize Naano
  to read your public profile once: name, photo, headline, country and follower count. We
  do not import your posts, engagement or private analytics."**
- Primary button, mid-action: **"Reading your profile…"**, disabled and dimmed.

Right pane during the read: the card renders its chrome immediately — LinkedIn glyph top
left, naano wordmark centre — with a pill floating over the header reading **"Reading your
profile…"** with a pulsing dot. The avatar is a grey circle with the initial "Y". The name
shows "Yuga Slova" **[inferred: a placeholder identity, since the finished card shows the
real name]**. Under it: "Your LinkedIn headline and topics will appear here." Then the
progress row: "Data" / an empty bar / "Pending". Then three metric cells, all em dashes:
"Followers", "Est. impressions", "Cost / post".

Three things to copy exactly: the reading state appears in two places at once (button
label and card pill), the card's skeleton is the real card rather than a grey box, and
the consent sentence names the five fields and disclaims three.

*Doing:* trading the minimum data for a card, without installing anything or handing over
a password. *State:* a profile import record with status, source URL, and the five fields.

**S3 — Step 3 of 4: "Complete your creator card".** Header strip now shows the imported
identity: avatar, "**2,438** followers", headline "Get API for any EHR or Payer Portal |
Building Tross".

- "Your country" — a select, pre-filled "India", labelled "Confirm your country before
  continuing." Pre-filled from the import, confirmed by the human.
- "Your industries (pick up to 3)" — "Choose up to 3 industries to help relevant brands
  find your card." A scrolling chip grid: B2B, B2C, AI, SaaS, Software, Sales, Marketing,
  SEO, Outreach, CRM, Creative, Productivity, Fintech, HealthTech, EdTech, Cybersecurity,
  Growth / GTM, HR, E-commerce, Developer Tools, Data / Analytics, Customer Support,
  Design, Real Estate / PropTech, LegalTech. Three were selected and show a check:
  AI, Software, Growth / GTM. Unselected chips are dimmed once three are chosen.
- "Continue".

The card on the right has now filled in: real photo, country flag badge top right, name
rendered as "**Shubham P.**" — first name plus last initial, not the full name — the three
industries as a dot-separated line "Software · AI · Growth / GTM", the headline, and the
metrics row now reading "2.4K Followers", "— Est. impressions", "**€315** Potential cost".
"Data / Pending" is still empty.

*Doing:* making the card findable. *State:* country, up to three industries, a derived
price.

**S4 — Step 4 of 4: price.** "OUR RECOMMENDATION", the €315 figure in a large stepper with
"/ post", and under it "This is your net price per post. You can change it at any time
from your Naano profile." Two buttons: "Create my marketplace profile" and "Add a bundle
(optional)". A back link reads "Edit my industries".

Note the word **net**. The creator sees what they receive, not what the brand pays.
**[inferred]** naano's margin sits on top of this number and is never shown to the creator
on this screen.

**S5 — Bundles, optional.** "Your bundle offer (optional) — Optionally set the total price
paid for several posts. You can add bundles later in Settings." A "PRIMARY BUNDLE" block
with "Number of posts" = 5 and "Total net price" = €1340, and a computed line underneath:
"€268/post · brand saves €235". Check: 5 × 315 = 1,575, minus 1,340 = 235. There is an
"Add another bundle" link and a delete icon, so bundles are a list. The card gains a pill
at the bottom: "5-post bundle · €1,340". Button: "Confirm my offer and create my profile".

**S6 — Optional professional information.** "OPTIONAL / Complete your professional
information now?" Body: "This step is optional now. You can complete it later from your
profile, before applying to paid campaigns, accepting bookings, invoicing or withdrawing
your earnings." Then jurisdiction copy: "**France and European Union:** a registered
professional activity is required to invoice companies and withdraw your earnings."
"**United States and outside the European Union:** a registered business is not mandatory.
You can continue as an individual and add professional information if you have it."
Buttons "Complete now" / "Finish later".

Read the gating carefully, because it is a product decision: tax identity blocks
*applying, accepting, invoicing and withdrawing*, but not *existing in the marketplace*.
The card goes live first. On this screen the card's price cell has become inline-editable
(a stepper and a pencil icon appear next to €315).

**S7 — Card reveal.** "Here is your Marketplace card / Tap it to flip it over. You will be
able to customize it in the profile coming next." The full card, centred, then "Continue
to my profile". A flip side exists and I did not capture it. **[inferred]** the back holds
the longer positioning and offer detail.

**S8 — Creator studio, profile tab.** `naano.com/creator?tour=1#profile`. Heading "YOUR
CREATOR STOREFRONT / Your Naano card, ready to travel." with "Share clear proof of your
positioning, audience and offers. Every improvement makes the card more useful to brands."
Edit / Preview toggle top right.

Below it the Deal Link panel: "YOUR CARD IS YOUR DEAL LINK / Put it on LinkedIn. Earn when
a brand joins through it. / Your public card presents your profile and keeps you selected
when a brand creates its account." Two tiles: "Add it as a LinkedIn experience — Keep your
card visible on your profile so brands can discover and book you." and "Send it when a
brand contacts you — When you receive a collaboration request, share your card so the deal
runs through Naano." Button "Copy or share my Deal Link". Right rail: "YOUR SHARE 25%",
"REWARD PERIOD 3 months". A five-step product tour overlays this, step 1 of 5 being "Your
Marketplace card — This is your private preview and editor."

Left nav, top to bottom: dashboard grid, card, marketplace/opportunities, layers
(campaigns or bookings), trending (analytics), people, wallet, percent (the referral
share), chat. Header: a wallet chip showing "€0", an EN/FR toggle, notifications, avatar.

**S9 — Opportunities.** `naano.com/creator#opportunities`. "Opportunities / Open brand
campaigns - apply, the brand accepts, and the booking is created on your terms."

Filter row: channel tabs "All channels 2" and "LinkedIn 2", a search box "Search for a
campaign or a brand…", and three selects: "All industries", "All countries", "Relevance
(default)".

Two campaign cards, "Premium Inboxes" and "OrbiSearch", each with: brand logo, campaign
name "Main campaign", a "100% match" pill top right, a "LinkedIn" channel pill top left,
a region pill "Europe · North America", a bar "Audience relevance 100/100", then a
three-cell stat strip — "100/100 MATCH", "LinkedIn CHANNEL", "6 days POST DEADLINE" — and
two buttons, "View the brief" and "Apply".

*Doing:* finding work without waiting to be found. *State:* a match score per
creator-campaign pair, an application.

### 1.2 Brand side

Six screens.

**B0 — Step 2 of 3: "Value prop & ICP".** `naano.com/register?role=saas`. Company avatar
"8x" beside the title, subtitle "Review these details once. Naano turns them into a brief
for your creators."

- "VALUE PROPOSITION — What the company does, for whom, how — 4 to 6 sentences. Edit if
  needed." A pre-filled scrolling textarea. Visible fragment: "…marketing or paid ads,
  8x's creator networks compound over time as accounts grow and content continues to drive
  views long after posting. Brands across SaaS, DTC, HR Tech, and AI see results in 3–5
  days with full managed execution, testing multiple creative formats simultaneously
  across 50+ countries with 250k+ creators…"
- "3 IDEAL CUSTOMERS (ICP) — The audiences your creators need to understand." Three
  numbered cards, pre-filled: "Head of Growth at B2B SaaS", "Brand Manager at DTC Wellness
  or Physical Product Company", "Marketing Lead at HR Tech or Career Tech Company", each
  with a short description.
- "STARTER CREATOR BRIEF / What your creators will receive" with a green "✓ Ready" badge.
  Inside: a PRODUCT column and an AUDIENCE column, the audience being the three ICPs
  concatenated. Then a highlighted guardrail line: "**Creators can adapt the angle to
  their expertise, while keeping every product claim factual.**" Then a footer: "Every
  creator you invite will receive this brief. You can edit it later from Campaigns."
- Buttons: "Back" and "**Continue to AI Matching**".

Two decisions here. The text is written for the brand and handed to them to edit, not
asked for as a blank form — the brand's job is approval, not authorship. And brand signup
*produces the first campaign*: the next URL carries
`?welcomeCampaign=5041f8de-…&welcomeStep=creators`. A brand that finishes signup already
owns a campaign with a brief.

**B1 — AI Matching, empty.** `naano.com/brand?...#marketplace`. A two-tab switch: "**AI
Matching**" and "Creator Marketplace". Heading "Hey 8x, let's find the right creators for
you." A prompt box pre-filled with "Find 4 creators for 8x creator brief. Use my campaign
brief and prioritize strong audience and content fit." Under "SUGGESTED FOR YOU", four
one-click prompts: "Find creators who already reach Head of Growth at B2B SaaS", "Find
creators with credible content about B2B", "Build a shortlist for this campaign angle: 8x
is described by the company as…", "Build a balanced creator shortlist for 8x".

Header: a wallet chip "€0.00", EN/FR, a "GET STARTED / Discover the Market…" progress ring
at 1/3, notifications, avatar. A breadcrumb top left reads "NAANO MCP / Connect →". Left
nav: dashboard, marketplace, layers, people, trending, chat, wallet.

**B2 — AI Matching, answered.** The prompt echoes back as a chat bubble, then a written
answer above the results:

> "I found 4 creators for 8x, ranked by relevance to your brief, then performance and
> cost."

followed by a paragraph naming each one and why, ending on the trade-off: "…All four have
demonstrable topic overlap, platform-native content experience, and listed post costs
under your EUR 1500 cap; the main trade-off is mixing deep product expertise (Dr Bart,
Eric) with storytelling/creative execution (Phil, Joseph) to maximize credibility and
shareability."

Then a ranked list, each row: rank number, avatar, name, LinkedIn badge, a category and
country flag, then three numbers and three controls.

| # | Name | Tag | Median views | CPM | Post cost |
|---|------|-----|--------------|-----|-----------|
| 01 | Dr Bart Jaworski | AI · Software 🇵🇱 | 40.2K | €34 | €1,375 |
| 02 | Phil Shorland | B2B · Marketing 🇬🇧 | 41.2K | €12 | €488 |
| 03 | Eric Djavid | B2B · SaaS 🇫🇷 | 79.4K | €14 | €1,125 |
| 04 | Joseph Rudd | AI · Marketing 🇬🇧 | 14.4K | €48 | €688 |

Controls per row: "Book", a bookmark, a chevron to the full card. Below the list:
copy / thumbs-up / thumbs-down. The composer at the bottom reads "Ask Nao a question, or
find creators…" with a "New research" reset.

CPM is not an input. CPM = post cost ÷ median views × 1000, and it checks out on all four
rows to the euro (1375/40.2K = 34.2; 488/41.2K = 11.8; 1125/79.4K = 14.2; 688/14.4K =
47.8). It is the comparison column — it is what makes a €1,375 creator and a €488 creator
commensurable — and it is derived, so it disappears the moment median views is unknown.

The written rationale is the product here, not the ranking. It names the constraint it
respected (the €1,500 cap) and the trade-off it made. A bare sorted list would be a
filter; this is a recommendation you can argue with.

**B3 — "Your selection".** A small modal. One option tile: "CREATOR RATE / Single post" at
"**1,375 €** / Standard rate". Body: "Book this option at the listed price, or propose a
lower price." Two buttons: "↔ Negotiate" and "Book · 1,375 €". A "Back" link, implying the
step before it chose between single post and bundle. **[inferred]** a creator with bundles
shows more tiles here.

**B4 — "Make an offer".** The negotiation modal, and the densest screen in the product.

- Header: avatar, "Dr Bart Jaworski · Single post", "Current price: 1,375 € per post"
- "Choose a discount": four tiles — "1,237.5 € / 10% discount", "**1,100 € / 20%
  discount**" (selected), "962.5 € / 30% discount", "Other / Enter a price"
- "Your offer": a euro input showing 1100, helper "The creator will see a 20% discount
  request."
- "Post by": a date input showing 25/09/2026 with a badge "14 days from now", helper
  "Latest date the creator must publish the post. Defaults to 14 days."
- "How should the creator work?": a selected tile "**Specific brief** — Use detailed
  instructions from one of your campaign briefs." **[inferred]** at least one sibling
  option exists, most likely a free-rein mode where the creator writes to the product
  rather than to a brief.
- "Campaign": a select showing "8x creator brief"
- A checkbox: "I want to approve the content before it is published."
- A notice: "**The creator receives the offer immediately and can accept or decline it
  within 48 hours.**"
- A primary button, cut off below the fold.

Everything a booking needs is decided in this one modal: price, deadline, brief, campaign,
approval mode, and an expiry clock.

**B5 — Creator Marketplace tab.** Not captured. **[inferred]** from the tab label and from
the creator-side filters: the same creator pool as a browsable, filterable grid of cards
rather than a prompt.

### 1.3 Where the two sides meet

This is the list I would defend as "the product". Each row is an action by one side that
becomes state visible to the other. Anything not on this list is a feature of one side
only and is a candidate for cutting.

| # | One side does | The other side sees | Carries |
|---|---------------|---------------------|---------|
| H1 | Creator publishes card | Card enters marketplace grid and the matching pool | Name, photo, headline, country, followers, industries, price, bundles |
| H2 | Brand finishes signup / creates campaign | Campaign appears in creator Opportunities with a match score | Brief, ICPs, deadline, channel, regions |
| H3 | Brand books or negotiates | Offer lands in creator inbox with a 48-hour clock | Price, post-by date, brief, campaign, approval flag |
| H4 | Creator accepts | Booking goes active on the brand's campaign; funds commit | Agreed price, deadline |
| H5 | Creator declines or counters | Brand sees the decline, or a counter price to accept | Counter price, note |
| H6 | Offer sits 48h | Both sides see it expire; creator loses it, brand's slot frees | — |
| H7 | Creator applies to an opportunity | Brand sees an applicant to accept | Card snapshot, match score |
| H8 | Creator submits a draft (approval mode only) | Brand approves or requests changes | Draft text |
| H9 | Creator marks posted with the post URL | Brand's campaign shows a live post; tracking starts | Post URL, published date |
| H10 | A reader clicks the tracking link | Brand sees clicks; creator sees their own click count | Click events |
| H11 | A reader converts on the landing page | Brand sees leads and attributed pipeline | Lead, value |
| H12 | Booking completes | Payout schedules; creator wallet moves | Amount, status |
| H13 | Creator's post history accumulates | Median views and CPM appear on their card for every future brand | Views |

H13 is the loop that makes the marketplace compound and it is the reason "Est.
impressions" is allowed to be a dash. A creator's first booking is sold on followers and
price. Their second is sold on measured performance. The dash is not a gap in the design,
it is the state before the loop closes.

---

## 2. Data model

Provenance legend, used on every field. This is the part of the plan I most want argued
with.

- **[I]** imported from the profile service
- **[D]** derived by us from other fields, never stored as a fact
- **[M]** entered by a human in the product
- **[S]** seeded for the demo, would be [I] or [X] in production
- **[X]** measured by us from our own events
- **[—]** deliberately absent; renders as a dash with a pending state

### 2.1 Entities

**Account** — one row per login. `id`, `email` [M] unique, `password_hash` [M],
`role` ('creator' | 'brand') [M], `created_at`, `last_seen_at`. A session is a signed,
HTTP-only cookie carrying account id and role, seven-day expiry. Every read of a campaign,
offer, booking, ledger or payout row is scoped by `account_id` inside the data-access
layer, not in the page component, so a forgotten check is a missing argument rather than a
data leak.

Password and not a magic link: a magic link needs email delivery, a sending domain and a
deliverability problem at 3am. A hashed password and a cookie needs none of that, and a
stranger can get back into the account they made yesterday. No password reset in this
build, named in the README as absent.


**Brand** — `id`, `account_id`, `name` [M], `logo_url` [M/S], `website` [M],
`value_proposition` [M, pre-filled in production by generation, seeded here],
`icps` (jsonb, three objects of `{title, description}`) [M/S], `wallet_balance_cents`
[D from the ledger].

**Creator** — the marketplace card. The object both sides share.
- `id`, `account_id`
- `linkedin_url` [M] — the only thing the human types in step 2
- `full_name` [I], `display_name` [D] — first name + last initial, as "Shubham P."
- `avatar_url` [I], `headline` [I], `country` [I, confirmed M in step 3]
- `follower_count` [I] — the one number the whole price rests on
- `industries` — up to 3 [M]
- `price_per_post_cents` [D then M] — default `round(followers × 0.13)`, editable forever
- `median_views` [X in production, S for seeded creators, — for new signups]
- `cpm_cents` [D] — `price / median_views × 1000`, null whenever median_views is null
- `card_status` ('importing' | 'draft' | 'live')
- `profile_data_state` ('pending' | 'partial' | 'complete') — drives the "Data / Pending"
  bar
- `tax_profile_complete` [M] — gates applying, accepting, invoicing, withdrawing; does not
  gate being listed

**ProfileImport** — the audit trail for the consent sentence, and the reason the sentence
is safe to make. `id`, `creator_id`, `source_url`, `url_slug` (normalized, uniquely
indexed), `tier` ('cache' | 'live' | 'manual'), `status` ('reading' | 'ok' | 'timeout' |
'failed'), `meta_freshness` ('live' | 'cached' | 'stale') straight from the service's meta
block, `raw_payload` jsonb, `fields_used` (the five named fields, stored explicitly so the
consent claim is checkable), `fetched_at`. One row per authorization. The consent sentence
promises a *single* read; this table is what makes that promise auditable rather than
decorative, and the slug index is what guarantees a profile already in the cache is never
read twice.

Three constraints that exist only because strangers can reach this endpoint:

- **Dedupe.** `url_slug` is unique across live cards. The second person to paste a profile
  that is already claimed is told the card exists. They do not get a duplicate listing,
  and the marketplace does not quietly fill with the same person twice.
- **Rate limit.** Five imports per IP per hour, counted in Postgres, plus a global daily
  ceiling. Every live call spends your money. An unmetered import endpoint on a public URL
  is the one thing in this build that can generate a bill overnight.
- **Ownership is unverified and says so.** Nothing stops someone pasting a profile that is
  not theirs. The honest fixes are an OAuth handshake or a verification post, and both are
  out of scope for 24 hours. The creator carries a `verification_state` of 'unverified',
  the card renders no verified badge, and the README names this as the first thing I would
  build on day two. Claiming to have solved it would be worse than leaving it open.


**Bundle** — `id`, `creator_id`, `post_count` [M], `total_price_cents` [M],
`unit_price_cents` [D], `savings_cents` [D] = `post_count × price_per_post − total`,
`is_primary`.

**Campaign** — `id`, `brand_id`, `name` [M] ("Main campaign"), `brief_product` [M],
`brief_audience` [D from the brand's ICPs], `brief_guardrail` [constant: creators may
adapt the angle, product claims stay factual], `channel` ('linkedin'), `regions` [M],
`post_deadline_days` [M], `budget_cap_cents` [M] (the "EUR 1500 cap" the matcher honoured),
`status` ('draft' | 'open' | 'closed').

**Offer** — created by the brand's modal, one row per booking attempt.
`id`, `campaign_id`, `creator_id`, `brand_id`, `list_price_cents` [D, snapshotted],
`offer_price_cents` [M], `discount_pct` [D], `post_by` [M, default now + 14 days],
`work_mode` ('specific_brief'), `requires_approval` boolean [M], `status`, `expires_at`
[D, created_at + 48h], `counter_price_cents` [M, nullable], `note` [M, nullable].

Snapshotting the list price matters: the creator can change their price the day after an
offer goes out, and the offer must not move underneath either party.

**Application** — the mirror of Offer, from the other direction. `id`, `campaign_id`,
`creator_id`, `match_score` [D], `status` ('pending' | 'accepted' | 'rejected'). An
accepted application creates a Booking at the creator's list price.

**Booking** — the contract. `id`, `offer_id` or `application_id`, `campaign_id`,
`creator_id`, `brand_id`, `agreed_price_cents` [D, frozen at acceptance], `post_by`,
`requires_approval`, `status` (see 2.3), `draft_content` [M, nullable],
`post_url` [M], `posted_at` [M], `self_reported_views` [M], `tracking_code` [D, generated
at acceptance]. `requires_approval` and `draft_content` are written by the schema and read
by nothing in the first pass; see the note under 2.3.

`self_reported_views` is labelled as such everywhere it appears. We do not read LinkedIn,
so views are the creator's number and the UI says so. Clicks and leads are ours and the UI
says that too. The honest split is a feature, not an apology.

**TrackingLink / ClickEvent / Lead** — `tracking_code` unique per booking, so every click
resolves to exactly one creator, one campaign, one brand. ClickEvent: `id`,
`tracking_code`, `occurred_at`, `referrer`, `user_agent_family`, `ip_hash` [X]. Lead:
`id`, `tracking_code`, `email` [M by the visitor], `company`, `occurred_at`,
`pipeline_value_cents` [S — a fixed per-campaign deal value, since real pipeline value
comes from a CRM we are not integrating].

I want to be explicit that `pipeline_value_cents` is the softest number in the model. The
public site advertises "€48.2K" of attributed pipeline. Real pipeline value comes out of
the brand's CRM. In this build it is a per-campaign constant times lead count, and the UI
calls it "estimated pipeline" with the assumed deal value visible next to it. Showing a
euro figure without showing its multiplier would be the same sin as inventing impressions.

**LedgerEntry** — one table for both wallets. `id`, `account_id`, `direction`,
`amount_cents`, `kind` ('wallet_topup' | 'booking_hold' | 'booking_charge' |
'creator_earning' | 'payout'), `booking_id` nullable, `created_at`. Balances are [D] from
this table and never stored as a column. Money that lives in a mutable integer column is
money that goes wrong on camera.

**Payout** — `id`, `creator_id`, `booking_id`, `amount_cents`, `status` ('scheduled' |
'paid'), `scheduled_for`. The public site shows "Creator payout €1,240" with "Payment
scheduled", so scheduled-then-paid is the real shape.

**MatchScore** [D] — computed, not stored, per creator-campaign pair. Inputs: industry
overlap with the campaign's ICPs, country inside the campaign's regions, price under the
budget cap, and audience relevance. Surfaces as "100/100 MATCH" on the creator's
opportunity card and as ranking on the brand's shortlist. Same function, both sides,
which is the point.

### 2.2 Relationships

```
Account ─1:1─ Brand ─1:N─ Campaign ─1:N─ Offer ─0:1─ Booking
   │                            │                       │
   │                            └─1:N─ Application ──────┘
   │                                                     │
   └─1:1─ Creator ─1:N─ Bundle                           ├─1:1─ TrackingLink
             │                                           │         ├─1:N─ ClickEvent
             ├─1:N─ ProfileImport                        │         └─1:N─ Lead
             └─1:N─ Booking ───────────────────────────  ┴─1:1─ Payout

LedgerEntry ─N:1─ Account, ─N:0..1─ Booking
```

Offer and Application are two doors into the same room. Both terminate in a Booking, and
everything after acceptance is identical regardless of which door was used. Building them
as one state machine with two entry points is what keeps the second door cheap — which is
why the creator's Apply button survives the cut in section 3 despite being a whole extra
flow.

### 2.3 Campaign lifecycle, brief to payout

The states a Booking moves through, with the trigger and what each side sees.

| State | Entered when | Brand sees | Creator sees |
|-------|--------------|------------|--------------|
| — | Brand creates campaign | Campaign open, 0 booked | Opportunity with match score |
| `offered` | Brand submits the offer modal | "Awaiting response", 48h countdown | Offer in inbox, 48h countdown |
| `countered` | Creator proposes another price | Counter to accept or reject | "Waiting on brand" |
| `expired` | 48h elapses with no answer | Slot frees, creator re-bookable | Offer greyed, "Expired" |
| `declined` | Creator declines | Decline, can re-offer | Removed from inbox |
| `accepted` | Creator accepts (or brand accepts a counter or an application) | Creator on the roster, funds held | Booking with brief, deadline, tracking link |
| `drafting` | Approval mode only | Nothing yet | Draft editor |
| `in_review` | Creator submits the draft | Approve / request changes | "In review" |
| `approved` | Brand approves | "Awaiting post" | Cleared to publish |
| `posted` | Creator submits the post URL | Live post, metrics begin | Live post, metrics begin |
| `measuring` | Automatic, on first click | Clicks, leads, pipeline accruing | Clicks accruing |
| `completed` | Brand confirms, or deadline + 7 days | Final cost, CPM, CPL | Earning credited |
| `paid` | Payout runs | Charge on the ledger | Wallet balance moves |

Non-approval bookings skip `drafting`, `in_review` and `approved` and go
`accepted → posted`. That is the checkbox on the offer modal choosing between a three-step
and a one-step path.

**Three of these states are modelled and not built.** `drafting`, `in_review` and
`approved` stay in the enum and in this table because they are the correct model and
because the hour that restores them should not also be an hour of schema work. In the
shipped build every booking takes the `accepted → posted` path, and the offer modal ships
without its approval checkbox. Section 3 argues that cut and says what it bought.

Money moves three times: a hold at `accepted`, a charge at `completed`, a payout at
`paid`. Three ledger rows per booking, every balance derived from them.

---

## 3. The cut

There are now two audiences, and a feature has to serve one of them to survive.

The first is the five-minute video: a judge should see one campaign go from a brand's
search to a creator's bank balance without a cut to a different tab. The second is new,
and it is the reason this section changed: a judge who closes the video and opens the live
URL has to be able to sign up as a stranger and get somewhere real on their own. The
second audience is less forgiving. A video can be rehearsed around a rough edge. A
stranger walks straight into it.

### In the first pass — real data, real Postgres, real state changes

1. **Accounts and sessions.** Email and password, hashed, signed cookie, role on the
   account, ownership enforced in the data layer. Built at hour three rather than bolted
   on at hour twenty, because retrofitting scope checks across twenty query sites is how a
   build like this dies.
2. **Creator onboarding, all four steps, with step 2 built to the recon.** The consent
   sentence verbatim, the dual reading state on button and card, the card skeleton that is
   the real card, the dashes with a pending bar. This is the screen the brief named, it is
   the best two minutes of the video, and it is now also the first thing a stranger
   touches.
3. **The `ProfileImporter` resolution chain**, real service included, with dedupe, rate
   limiting, a four-second timeout and a manual fallback that never dead-ends a signup.
   Section 5 has the shape.
4. **The marketplace card as a shared component.** One component renders in the onboarding
   preview, the brand's grid, the brand's shortlist rows, the public card page and the
   creator's studio. Build it once and five screens land at once.
5. **Brand marketplace: browse, filter, open a card.** Filters on industry, country and
   price cap.
6. **The offer modal, complete.** Discount tiles at 10/20/30 plus Other, post-by date with
   the 14-day default, campaign select, 48-hour notice. One form, the densest screen in
   the product.
7. **Creator offer inbox: accept, decline, counter, with a live 48-hour countdown.**
8. **Creator Opportunities with Apply.** Promoted from expendable to mandatory. It is the
   only action available to a creator who signed up sixty seconds ago and has no offers.
9. **Booking detail on both sides**, post URL submission, tracking link issuance.
10. **The tracking redirect and the attribution chain.** `/r/[code]` records a click and
    redirects to a campaign landing page with a lead form. The only part of the product
    that is genuinely ours rather than a view of LinkedIn, and the cheapest impressive
    thing here: one route, two tables, one form.
11. **Brand campaign dashboard.** Per-post views, clicks, leads, estimated pipeline, cost,
    CPM, CPL. Campaign totals on top.
12. **Payouts.** Complete a booking, a payout schedules, the creator's wallet moves, the
    ledger explains the balance.
13. **Cold start for brand-new accounts.** Seeded open campaigns so a new creator has
    something to apply to, and a labelled auto-responding counterparty on each side so one
    person alone can walk the whole loop. Section 6.
14. **Seed of 25 creators from cached profile JSON**, one seeded brand with a campaign and
    four historical bookings carrying real-looking metrics, so no screen is ever empty.

### Stubbed — present and convincing, not real underneath

- **AI matching.** Keep the prompt box, the four suggested prompts, the chat echo and the
  written rationale. Behind it, a deterministic scorer over industry overlap, region,
  price cap and audience relevance, and a template that renders the rationale from the
  reasons the scorer actually used, naming each creator and stating the trade-off. *Why
  stubbed:* the rationale is the product, and a deterministic rationale is reproducible on
  camera, needs no API key, cannot hallucinate a creator who is not in the database, and
  costs nothing when a stranger hammers it. A real model call goes behind a flag if hour
  22 is quiet. Of all the stubs this is the one I am most comfortable defending.
- **Payments.** No Stripe. Wallet top-up writes a ledger row; payout flips a status. *Why:*
  the money model is what is being judged and the ledger demonstrates it completely.
  Stripe adds a redirect, a webhook and a compliance surface, and shows a judge nothing
  new. A stranger with a live card field is also a problem I do not want on a 24-hour
  build.
- **Views.** Creator types their post's view count; seeded creators have history. Labelled
  "self-reported" wherever it appears. *Why:* we do not read LinkedIn, and saying so is
  better product judgement than a number nobody can source.
- **Pipeline value.** Lead count times a per-campaign assumed deal value, with the
  multiplier shown next to the total. *Why:* see 2.1.
- **Bundles.** Creators define one, cards show the pill, brands see the tile in "Your
  selection". Booking a bundle as a multi-post contract is not wired. *Why:* a multi-post
  booking multiplies every state in 2.3 by n, for one extra pill on screen.
- **Brand onboarding.** A campaign-create form with the three ICP slots and the brief
  preview panel rendering live, pre-filled from a template. No generated value prop, no
  model call. *Why:* a stranger signing up as a brand must be able to create a campaign,
  so the form is now mandatory. The generation behind it is not.
- **Messaging.** No chat. Counter-offers carry a note field. *Why:* chat eats a day and
  shows a judge an empty thread.

### Deliberately absent

- **The content approval loop**, and with it the "I want to approve the content before it
  is published" checkbox. This is the feature that paid for real auth. Reasoning in full
  below, because it is the cut I am least sure about.
- **The Deal Link and the 25% / 3-month referral.** The best business idea in the product
  and it produces nothing filmable: it pays out months later, needs referral attribution
  at brand signup, and has no state either side can see inside five minutes. Named in the
  README as understood and deferred, which is worth more than a half-built version.
- **Profile ownership verification.** Covered in 2.1. Absent, flagged in the data model,
  named as day-two work.
- **Password reset, and email of any kind.** No provider, no sending domain, no
  deliverability problem. A stranger who forgets their password makes a second account.
- **EN/FR toggle.** A second locale taxes every string I write for 24 hours.
- **Multi-network.** The card shows a LinkedIn glyph and the filters say "All channels 2".
  The model has a `channel` column and nothing else assumes LinkedIn, so this is a seam.
- **The MCP connector**, notifications, teams and seats, invoice PDFs, disputes and
  refunds, the creator vetting queue, multi-currency, the card's flip side, the five-step
  product tour. Each is real surface. None is on the line from search to bank balance.

### The cut I am least sure about

It has changed. It used to be brand onboarding; that is now half-built anyway, because a
stranger needs to create a campaign. **It is now the content approval loop.**

The case for keeping it: it is on the demo path, it is a visible handoff (H8), and it is
the only place where the brand and the creator touch the work itself rather than the
terms. Every other interaction between them is a price and a date. Cutting it means the
offer modal loses its approval checkbox, because a checkbox that does nothing is worse
than an absent feature, and that modal is the densest and best screen on the brand side.
I am removing a control from the screen I most want a judge to study.

The case for cutting it, which is why it is cut: it is three states in the booking machine
(`drafting`, `in_review`, `approved`), two screens, and a round trip that adds ninety
seconds to a five-minute video without adding a number to any dashboard. Real accounts for
strangers cost about five hours and this is the cleanest five hours I could find.

If hour 21 is calm, the cheap version comes back: keep the checkbox, and when it is
ticked the creator's booking screen shows a single draft field with one Submit, and the
brand's shows the draft with Approve. No revision history, no request-changes loop, no
notifications. That is about an hour and it restores the handoff and the checkbox
together. It is the first thing I would promote off this list.

Runner-up, unchanged in substance: I remain uneasy that brand onboarding ships without the
generated value prop and ICPs. The guardrail line, that creators may adapt the angle while
every product claim stays factual, is the sharpest single sentence in either walkthrough
and it now survives only as static template text.

---

## 4. Build order

24 hours, one person, filming near the end and then handing over a URL that strangers will
use. Three rules shape the order. Something is deployed in hour one. Auth exists before
anything that needs scoping, not after. And there is a complete two-sided path by hour ten
and a half, after which every block is additive, so a bad hour costs a feature rather than
the demo.

| Hours | Block | Done means |
|-------|-------|-----------|
| 0–1 | Next.js + TypeScript, Supabase Postgres, Prisma, **deploy to Vercel immediately** | The live URL serves a page before any feature exists |
| 1–2.5 | Schema from section 2, migrations, seed script, 25 creators from cached profile JSON | `select * from creators` returns a populated marketplace |
| 2.5–4 | Accounts, password hashing, signed cookie sessions, scoped data-access layer | Two accounts exist and neither can see the other's rows |
| 4–6 | The card component, the public card page, the brand marketplace grid with filters | First screen worth filming |
| 6–8.5 | Creator onboarding all four steps, the importer chain, dedupe, rate limit, the step-2 UX in full | A stranger signs up with a real profile URL and their card is in the grid |
| 8.5–10.5 | Offer modal → Offer row → creator inbox → accept → Booking | **Milestone: end-to-end across both sides.** Protect this above everything |
| 10.5–12 | Booking detail both sides, post URL submission, tracking code issued | A booking runs to `posted` |
| 12–14 | `/r/[code]` redirect, click capture, campaign landing page, lead form, Lead rows | A click in one tab moves a number in another |
| 14–16 | Brand campaign dashboard: funnel, per-post table, CPM and CPL; creator earnings view | Both sides read the same campaign |
| 16–17 | Ledger, wallet balances, payout schedule and mark-paid | Money closes the loop |
| 17–18.5 | Match scorer, brand shortlist with rationale, creator Opportunities with Apply | The second door works |
| 18.5–20 | Cold start: seeded open campaigns, the auto-responding counterparties, first-run states | A brand-new account has somewhere to go on both sides |
| 20–21.5 | Pending and empty states, the dash rule enforced, loading states, copy pass, responsive check, error boundaries, hostile-input pass on the import form | No screen shows a zero where it means unknown, and no paste crashes a page |
| 21.5–22.5 | Demo seed with history, a clean account for the live signup on camera, buffer | Nothing on screen is empty or absurd |
| 22.5–23.5 | Rehearse twice, record once | Five minutes, no cuts |
| 23.5–24 | README with the cut list and the deferred features, final deploy, **then** share the URL | A judge can read what was decided and why |

Record before the URL goes out. Strangers mutate state, and the campaign the video walks
through should not have someone else's test booking in it by the time anyone watches.

**The order of sacrifice has inverted.** It used to run: Opportunities first, then the
draft loop, then the payout ledger. Opportunities is now untouchable, because it is the
only thing a creator with no offers can do, and the draft loop is already cut. If hours run
short the order is now: the payout ledger collapses to a single status flip with no
three-row trail; then the brand dashboard loses its per-post table and keeps campaign
totals; then the match rationale drops from a paragraph to one sentence. Never the auth
layer, never the importer chain, never the tracking chain.

### The five minutes

1. **0:00** Live URL, brand side, marketplace populated with 25 creators. Filter to AI and
   Software under €1,500.
2. **0:40** Switch to AI Matching. Ask for four creators. Read the rationale aloud,
   including the trade-off sentence. Point out that CPM is derived and that a creator with
   no history shows a dash instead of a guess.
3. **1:20** Open Dr Bart, Negotiate, 20% off, post-by date, pick the campaign, send. Note
   the 48-hour clock.
4. **1:55** Switch to the creator account. Real sign-in, not an account switcher. The offer
   is there with the countdown. Accept. Show the brief and the tracking link.
5. **2:30** Paste the post URL. Switch back; the brand's campaign shows a live post.
6. **2:55** Open the tracking link in a new tab, submit the lead form.
7. **3:15** Brand dashboard. Clicks and leads have moved. Point at the assumed deal value
   sitting next to estimated pipeline, and say out loud which numbers are measured and
   which are self-reported.
8. **3:45** Complete the booking. Payout schedules, the creator's wallet moves, the ledger
   shows its three rows.
9. **4:15** New creator signup on the live URL, step 2 only. Paste a profile, watch the
   card fill in, read the consent sentence on camera.
10. **4:45** End on the invitation: the URL is open, sign up with your own profile, the
    card you get is the card in the grid. **Ending here is deliberate.** It is the best
    screen, it is what the brief asked for, and under the new answer it is also a claim
    the judge can go and test in thirty seconds.

---

## 5. On the stack, once

The given stack is right and I am not going to spend a paragraph arguing otherwise.
Next.js with server actions removes an entire REST layer I would otherwise hand-write,
Vercel plus Supabase is the fastest path to a public URL, and Postgres is the correct
answer for a model with this many relations.

Three things I would change inside it, and then I will do whatever you say:

1. **Prisma over Drizzle**, purely for migration speed under time pressure. Use Supabase's
   pooled connection string on Vercel or you will spend hour 20 debugging connection
   exhaustion instead of building.
2. **Server actions, not API routes**, everywhere except two places that must be real HTTP
   endpoints: the tracking redirect `/r/[code]`, and the profile import proxy. The import
   must be server-only so the service key never reaches the browser.
3. **No component library beyond Tailwind and a headless primitive for the modal and the
   select.** The card is the product's signature and it has to be hand-built. A component
   library will not make it look like the recon and will cost more time fighting than it
   saves.

On the `ProfileImporter`: one interface, `importProfile(url) -> {fields, meta, tier}`, and
under it a three-tier resolution chain rather than two swappable implementations. The chain
is what lets both of your constraints hold at once, now that strangers are in scope.

1. **Cache.** Normalize the URL to a slug and look in `ProfileImport`. A hit resolves with
   `tier: 'cache'` after an artificial 1,200ms, so the reading state is something you can
   see rather than a flash. The 25 seeded profiles live here, which means every URL the
   video touches resolves locally and deterministically. Nothing on camera depends on a
   live call, exactly as you asked.
2. **Live.** A miss calls your service server-side, URL and key from env, four-second
   timeout, and writes the result back into the cache so the profile is only ever read
   once. This is the tier a stranger's own profile lands on, and it is why the product is
   real rather than a rehearsal.
3. **Manual.** A timeout, a failure, or a profile the service does not know falls through
   to manual entry of the five named fields. The card keeps filling in live from what the
   human types, the `ProfileImport` row records the tier and the failure, and the signup
   completes. A failed import is a slower signup, never a dead end.

Tier selection is automatic, not an env flag. An env flag would have forced a choice
between a camera-safe demo and a working product; the chain gives both, and the cache
write in tier two means the second visitor to any profile gets tier one for free.

---

## 6. The stranger path

New section, and the direct consequence of your answer. The question it answers: what
happens to someone who watches nothing, reads nothing, and just signs up?

**The failure mode I am designing against** is the empty room. A creator finishes the
onboarding I have spent six hours perfecting, lands in the studio, and finds no offers, no
bookings, no earnings and nothing to click. They have used a card builder. They have not
seen a marketplace, and the marketplace is the product.

**Creator, first ninety seconds.** Signup, import, card, live. The studio they land in has
Opportunities already populated, because the seed includes open campaigns from several
brands with deadlines in the future and regions wide enough to match a new card. The match
score is computed against their real industries, so the number on screen is about them.
They can read a brief and apply immediately. That much is just seeding done deliberately
rather than decoratively.

**The counterparty problem.** Applying is a dead end if no brand is awake. So one seeded
brand and two seeded creators are marked `auto_respond`. An application to that brand
produces an offer within about thirty seconds. An offer to those creators produces an
acceptance. Both are labelled on screen, in the row itself: "Demo brand, responds
automatically". Not in a footnote, not in the README, on the row.

I want to argue for this rather than slip it in, because it is the one thing in the plan
that manufactures activity. The test I applied: does it let a stranger see something true
about the product that they otherwise could not see, and is it honestly labelled? A
marketplace where one person can only ever act from one side is a marketplace nobody can
evaluate alone. The auto-responder lets a single visitor walk offer to booking to post to
tracked click to payout in four minutes, by themselves, which is the entire thesis of the
product. Labelled, it is a demo fixture. Unlabelled, it would be a lie about liquidity,
and it is exactly the kind of thing that makes a marketplace look fraudulent when someone
works out what happened. So it is labelled, and the label is not negotiable.

**Brand, first ninety seconds.** Signup, campaign-create form with the three ICP slots and
the brief preview rendering live beside it, then straight into a marketplace of 25 real
seeded cards. They can filter, they can read the rationale from the matcher, they can send
a real offer. Two of those creators answer.

**Protecting the demo state.** Strangers are additive only. Seeded rows are never mutated
or deleted by anything a visitor can do; a stranger's offer to a seeded creator creates new
rows and touches nothing the video depended on. Wallet top-ups are play money on a ledger.
The import endpoint is rate-limited per IP with a global daily ceiling, which is the only
place a stranger can cost real money.

**What a stranger will still find rough**, and what the README will say so before they do:
there is no password reset, nobody verifies that the profile you pasted is yours, view
counts are self-reported, pipeline value is lead count times a stated assumption, and the
matcher is a scorer with a template rather than a model. Every one of those is a decision
in section 3 with a reason attached. Writing them down before a judge finds them is
cheaper than having them found, and it is the same argument as the dash on the card: say
what you do not know, rather than filling the space.


---

## 7. The visual system

I did not pick a theme off a list. naano ships its design tokens in the stylesheet on the
public site, so this section is mostly transcription. Everything below was read out of
computed styles on naano.com unless marked **[inferred]**.

### What they are actually built on

The `:root` block carries `--primary`, `--secondary`, `--muted`, `--accent`, `--popover`,
`--card`, `--destructive`, `--ring`, `--sidebar`, `--sidebar-accent`, `--chart-1` through
`--chart-5`, and `--radius: 0.625rem`. That is the shadcn/ui variable contract, exactly,
including the 10px default radius. Alongside it sit `--spacing`, `--text-*`, `--color-*`
and `--tracking-*`, which is the Tailwind v4 theme layer.

**naano is shadcn/ui on Tailwind v4.** So the answer to "which theme" is: theirs. We are
not choosing a look, we are porting a token file, and matching the recon stops being an
eyeballing exercise.

This does not contradict section 5. shadcn/ui is not a component library in the sense I
was arguing against. Components are copied into the repo as source over Base UI
primitives, with no runtime dependency and nothing to fight when the card needs to be
hand-built. As of July 2026 new shadcn projects default to Base UI rather than Radix;
Radix still works, and either is fine here.

### Tokens to copy verbatim

Two palettes, and the split matters. The marketing site and the app do not use the same
blue.

| Token | Value | Where |
|---|---|---|
| `--accent` | `#2563EB` | The app. Tailwind blue-600 |
| `--lp-brand` | `#1652f0` | Marketing. Hotter, more saturated |
| `--lp-brand-strong` | `#1240d0` | Hover and pressed |
| `--lp-brand-soft` | `#e8f0fe` | Tints, selected chips, info blocks |
| `--lp-success` | `#00b67a` | The "✓ Ready" badge |
| `--lp-success-soft` | `#d7f2e9` | Its background |

The neutrals are the detail I would most expect a rebuild to miss. They are **warm, not
cool**:

| Token | Value |
|---|---|
| `--lp-ink` | `#37352f` |
| `--lp-ink-soft` | `#787774` |
| `--lp-ink-mute` | `#b4b4b0` |
| `--lp-border` | `#e9e9e7` |
| `--lp-surface` | `#ffffff` |
| `--lp-surface-2` | `#fafaf9` |
| `--lp-surface-3` | `#f7f6f3` |
| `--lp-beige` | `#f4f0e8` |
| `--lp-footer` | `#1c1b19` |

`#37352f` is Notion's ink. The body background is `rgb(252, 252, 251)`, an off-white with
a warm cast. Reach for Tailwind `slate` here, which is the reflex, and every surface comes
out faintly blue and subtly wrong against that cobalt. Warm greys under a hot blue is the
whole trick.

### Type

Loaded faces: `Inter LP` (a self-hosted Inter), `Inter`, `Plus Jakarta Sans` behind a
`--font-jakarta` variable, and `GFS Didot` as a minor accent.

Headings on the marketing site are Inter at weight **600 to 650** with hard negative
tracking: 34px at -1.02px, 38px at -1.71px, 20px at -0.4px. Roughly -0.025em to -0.045em,
scaling with size. Not 700, not bold, tight.

**[inferred]** the app's display headlines use Plus Jakarta Sans. The variable is defined
but barely used on the landing page, and the letterforms in the onboarding screens, the
lowercase naano wordmark and "Build a card brands can trust.", are geometric in a way
Inter is not. Both faces are on Google Fonts and load through `next/font/google`, so this
costs nothing to get right either way.

Practical setup: Plus Jakarta Sans for display and card names, Inter for UI and body, and
a `tracking-tight` default on every heading over 20px.

### Depth

Shadows are **blue-tinted, never black**. Measured:

```
rgba(52, 91, 111, 0.10)  0  8px 22px
rgba(56, 96, 128, 0.32)  0 20px 48px -32px
rgba(46, 86, 108, 0.42)  0 22px 48px -38px, inset 0 1px 0 #fff
```

Three things there. The tint is a desaturated blue-grey, which is what makes cards read as
sitting on a sky rather than on paper. The large blurs carry heavy negative spread, so the
shadow tucks under the card instead of haloing it. And some surfaces take an inset white
top highlight, one pixel, which is what gives the marketplace cards their slight lift.

Hairline borders are drawn as `box-shadow: 0 0 0 1px rgba(17, 19, 24, 0.06)` rather than a
border, so they never affect layout.

Radii in use: `999px` for pills, `50%` for avatars, then 8, 12, 14, 20 and 26px. The
shadcn base of 10px sits in the middle of that range.

### The sky

The marketplace background in the brand screenshots is not a CSS gradient alone. It is a
pale cyan gradient with cloud PNGs layered over it and a noise filter on top:

```
linear-gradient(#dff3fc 0%, #edf9fe 72%, #fff 100%)
radial-gradient(circle at 50% 60%, rgba(208,237,251,.35), transparent 44%)
+ /lp/cloud-layer-bottom-v1.png
+ an SVG feTurbulence grain overlay
```

I am not reproducing the cloud art. Two CSS gradients plus the grain filter gets most of
the way there for ten minutes of work, and the 3D cloud mascot on the AI Matching empty
state gets replaced by a simple mark. Chasing custom illustration in a 24-hour build is
the definition of the wrong hour.

### What this changes in the build

Nothing in the schedule. Hour 0 to 1 already had scaffolding in it, and this replaces
guesswork with a paste. Concretely:

- `npx shadcn init` on Tailwind v4, then overwrite the generated `globals.css` token block
  with the table above before writing a single component.
- Pull only the primitives I named: dialog, select, popover, tabs, checkbox, input, badge,
  progress. Eight components, no more.
- Charts: shadcn's chart block, which pins Recharts 3.8. naano already defines `--chart-1`
  through `--chart-5`, so the brand dashboard in hours 14 to 16 inherits its palette from
  the same token file rather than needing colour decisions at hour fifteen.
- The marketplace card stays hand-built. It is the product's signature, it renders in five
  places, and no registry component is going to produce it.

The reason to do the token file first rather than last: every hour after this one produces
screens, and screens written against the right tokens do not need a colour pass at hour
twenty. The polish block in hours 20 to 21.5 is then spent on empty and pending states,
which is where it actually earns something.
