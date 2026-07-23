## Progress Log

### Day 0 — Project Setup

- Scaffolded NestJS project; installed Prisma, ioredis, BullMQ, @nestjs/config
- Set up Docker Compose for local Postgres 16 and Redis 7, with healthchecks
  and a named volume for Postgres data persistence
- Diagnosed and resolved a port conflict between a native Postgres install and
  the Dockerized Postgres instance, both competing for port 5432
- Adapted to Prisma 7's split configuration model (schema.prisma for the
  runtime client, prisma.config.ts for CLI-time connection info)
- Verified end-to-end connectivity from Prisma CLI to the containerized database

# Fintech Core — Progress Log

Day-by-day build log: what was built, why, what broke, and how each
day's work builds on what came before.

### Day 0 — Project Setup

- Scaffolded NestJS project; installed Prisma, ioredis, BullMQ, @nestjs/config
- Set up Docker Compose for local Postgres 16 and Redis 7, with healthchecks
  and a named volume for Postgres data persistence
- Diagnosed and resolved a port conflict between a native Postgres install and
  the Dockerized Postgres instance, both competing for port 5432
- Adapted to Prisma 7's split configuration model (schema.prisma for the
  runtime client, prisma.config.ts for CLI-time connection info)
- Verified end-to-end connectivity from Prisma CLI to the containerized database

### Day 1 — Idempotency Guard

- Atomic: checks which request arrived first — if it's a new request, it's
  claimed as first; if it already exists, it's not
- 30 second TTL on the `processing` state (claim()): if a request is still
  marked processing after 30 seconds, something went wrong and it's treated
  as recoverable, not permanently stuck
- 24 hour TTL on the `completed` state (complete()): protects against
  Safaricom (or any caller) retrying the same callback long after the fact —
  a duplicate within this window gets the same stored result, not reprocessed
- Server crashing mid-session: the in-flight request is simply gone, nothing
  resumes it automatically. If a retry arrives within the 30s window, it's
  correctly rejected as "already in progress." Past that window, the retry is
  correctly treated as a brand new request
- Two separate Redis instances (danger scenario): each instance would have
  its own private record, so both could believe they're "first" for the same
  key — the entire safety guarantee silently breaks, resulting in duplicate
  processing with no error or warning
- Duplicate processing consequence: results in a customer being debited or
  credited twice for one real payment — a real accounting error requiring
  manual correction

### Day 2 — Double-Entry Ledger Schema & LedgerService

- Modeled Account, Transaction, and LedgerEntry using double-entry accounting
  principles instead of a naive mutable `balance` column
- Account represents identity only (a wallet, platform fee account, or M-Pesa
  settlement account) — it stores no balance
- Transaction is a pure grouping container — it has no amount and touches no
  single account directly, since a real transaction (e.g. a payment with a
  platform fee) can touch multiple accounts with different amounts each
- LedgerEntry is the single source of truth: one row per account touched,
  recording the amount and direction (DEBIT/CREDIT) for that specific movement
- A balance is never stored — it's always derived by summing an account's
  ledger entries, so balance and history can never silently disagree
- Reasoned through why per-entry balance snapshots (a future optimization)
  are a different risk than a mutable Account.balance field — a snapshot is
  written once and never touched again, so it can't drift the way an
  independently-updatable field can

**Built `LedgerService.recordTransaction()`:**

- Accepts a full set of proposed ledger entries up front (account, amount,
  direction) rather than exposing separate credit/debit methods — makes it
  structurally impossible for a caller to write an unbalanced transaction
- Validates `sum(DEBIT) === sum(CREDIT)` using Prisma.Decimal arithmetic
  (never native JS numbers) before writing anything
- Wraps the Transaction and all LedgerEntry creation in a single
  `prisma.$transaction()` — any failure rolls back everything, no partial
  or orphaned data ever persists
- Tested both paths: a balanced 3-entry transaction committed successfully
  with all entries correctly linked; a deliberately unbalanced transaction
  was rejected with a 400 before touching the database, verified via Prisma
  Studio that zero rows were written on failure

**Debugging notes (Prisma 7 specific):**

- The newer generator no longer implicitly reads DATABASE_URL from the
  schema's datasource block at runtime — PrismaService constructs a PrismaPg
  driver adapter (`@prisma/adapter-pg`) with the connection string and
  passes that into the PrismaClient constructor, rather than relying on
  Prisma's built-in query engine to manage the connection itself

### Day 3 — M-Pesa STK Push Integration

- Built MpesaService: OAuth token retrieval, STK Push initiation, all
  tested against Safaricom's real sandbox (not mocked)
- Cached access tokens in Redis using a fixed key, checking cache before
  ever calling Daraja — avoids unnecessary network calls and respects
  Safaricom's rate limits on token generation
- Used a safety-margin TTL (3300s) instead of Daraja's full 3600s token
  life, to avoid a token expiring mid-flight between cache read and
  Safaricom's request processing
- Implemented Daraja's exact Password field requirement: base64 of
  shortcode + passkey + timestamp, concatenated with no separators —
  a strict format that silently fails if built incorrectly
- Learned generateTimestamp() needs getMonth() + 1 (0-indexed months)
  and getDate() (not getDay(), which returns weekday) — both zero-padded
  to match Daraja's required YYYYMMDDHHmmss shape exactly
- Designed normalizePhoneNumber() to defensively accept common Kenyan
  phone formats (0712..., +254712..., spaced/dashed) and convert to
  Daraja's strict 2547XXXXXXXX requirement, rather than pushing that
  responsibility onto every caller — DTO validates basic shape only,
  service owns the actual business format rule
- Verified end-to-end: successful STK Push against sandbox test number,
  confirmed normalization works for both 0-prefixed and 254-prefixed
  input, confirmed invalid input is rejected with a clean 400 before
  ever reaching Daraja

### Day 4 — M-Pesa Callback: Idempotency + Ledger Integration

- Adapted the Day 1 idempotency pattern for webhook-style callbacks that
  carry no header, extracting CheckoutRequestID from the nested Daraja
  callback body instead
- Resolved phone number → wallet Account via the User relation, with an
  important fix: querying Prisma with `userId: user?.id` where user could
  be null resolves to `undefined`, which Prisma treats as "no filter" —
  silently returning an unrelated account instead of throwing. Fixed by
  checking user existence explicitly before any account lookup
- Extended Transaction with M-Pesa reference fields (unique constraints
  as a DB-level backstop under the Redis idempotency guard)
- Root-caused an intermittent 404/201 alternation on the callback route:
  STK Push requests capture CallBackURL at initiation time, so requests
  made before a mid-session .env fix delivered their callbacks to a stale
  path later — not a routing bug, an artifact of iterating on config live

**Verified end-to-end against Safaricom's live sandbox:**

- A real STK Push from a real phone triggered a real callback, delivered
  through ngrok, correctly parsed, resolved to the paying user's wallet,
  and recorded as a balanced Transaction (2 LedgerEntry rows) with
  Safaricom's MpesaReceiptNumber preserved
- Resent the identical real callback payload a second time — confirmed
  via Prisma Studio that exactly 1 Transaction and 2 LedgerEntry rows
  exist, proving the idempotency guard holds on a genuine duplicate,
  not just a synthetic test
- Known gap (deliberately deferred to Day 7): a successful M-Pesa payment
  for an unregistered phone number currently returns a 404, which would
  cause Safaricom to retry indefinitely for money that already moved into
  the settlement account with no ledger attribution — this exact scenario
  is what reconciliation is designed to catch

### Day 5 — BullMQ Retries, Exponential Backoff, and Dead-Letter Capture

**Problem:** the STK Push initiation call to Daraja was synchronous and
inline — a transient timeout, 500, or dropped connection meant the request
simply failed, with no automatic retry and no visibility if it failed
permanently.

**Built:**

- `MpesaStkPushQueueService` — a producer that enqueues STK Push requests
  onto a BullMQ queue instead of calling Daraja inline
- `MpesaStkPushProcessor` — a `WorkerHost` that pulls jobs off the queue
  and calls the existing `MpesaService.initiateSTKPush()`, unchanged — all
  retry logic is handled by BullMQ, not hand-written
- `DeadLetter` Prisma model — captures jobs that exhaust all retry
  attempts, since BullMQ has no built-in dead-letter queue primitive; this
  is the documented community pattern (listen on the worker's `failed`
  event, check `attemptsMade` against the configured max, write a record
  only once genuinely exhausted)

**Key design decisions, reasoned through:**

- **2 attempts, 1s exponential backoff** — deliberately short. STK Push
  initiation is synchronous and user-facing: a real customer is watching a
  loading state, waiting for the PIN prompt to appear. Long backoff (e.g.
  5s base, 3 attempts = ~35s worst case) does nothing for Safaricom's
  actual recovery time and only makes the customer wait longer. A
  background job with no one watching (e.g. reconciliation, Day 7) would
  warrant the opposite — longer, more patient backoff.
- **`DeadLetter.transactionId` is optional** — an STK Push initiation that
  never gets past the first request has no `Transaction` row yet (only
  created later, from a successful callback). A dead letter from
  initiation failure legitimately has nothing to link to.
- **Resolved a circular module dependency** between the queue module and
  MpesaModule by moving the STK-push-triggering controller into the queue
  module itself, rather than papering over it with `forwardRef()` —
  "receive HTTP request, enqueue job" belongs conceptually closer to the
  queue than to core M-Pesa service logic.

**Testing — including a real bug found along the way:**

- Verified the happy path end-to-end through the new async queue path,
  including a real callback landing successfully
- Forced a failure to test retries and dead-lettering. First attempt
  (corrupting `MPESA_CONSUMER_SECRET`) silently did not reproduce the
  failure — discovered why: `getAccessToken()` only calls Daraja when no
  token is cached, and a valid cached token from earlier testing was still
  within its TTL, so the broken credential was never actually exercised. A
  genuine lesson in how caching can silently mask a config problem.
- Fixed by clearing the cached token before retesting. Confirmed: 2
  attempts fired with correct ~1s backoff between them, and 2 real
  DeadLetter rows were written only after full exhaustion — visible in
  Prisma Studio alongside real Transaction history from successful
  attempts in the same session.

### Day 6 — Sliding-Window Rate Limiting

**Problem:** the STK Push endpoint had no limit on how often a single
requester could trigger it — nothing stopped rapid-fire abuse, each attempt
costing a real call to Daraja's own rate-limited API and, if successful, a
real PIN prompt firing repeatedly on someone's phone.

**Explored and rejected: fixed-window counting.** A naive approach —
increment a counter, expire it after 60 seconds, block once a limit is hit
— has a real, exploitable flaw: a requester can burst right before the
fixed reset boundary and again right after, getting far more than the
intended limit through in a short real-world span, because the system only
tracks "since the last reset," not "in the last 60 seconds, continuously."

**Solution: a sliding window using a Redis sorted set.** Each request is
stored as a member scored by its own timestamp. On every check: remove
members older than 60 seconds, count what remains, and only add a new
member if under the limit. This tracks a genuinely continuous rolling
window with no gameable reset point.

**Found and fixed a real concurrency race, by tracing it manually:**
initially built using ioredis's `pipeline()`, assuming it gave atomicity
across the whole remove/count/add sequence. Traced through a concrete
scenario — two simultaneous requests both reading the same "count so far"
before either had added itself — and confirmed both would pass the check,
letting the limit be silently exceeded. Root cause: `pipeline()` batches
commands into one network round-trip for performance, but does **not**
prevent a different client's pipeline from interleaving its own commands
in between. Fixed by moving the entire remove/count/check/add sequence
into a single Lua script executed via `EVAL` — Redis guarantees a Lua
script runs as one truly atomic, uninterruptible unit, closing the race
completely.

**Design decision — identify requesters by phone number, not User ID.**
The STK Push route is unauthenticated; resolving a `User` from the phone
number first would mean legitimate first-time payers (no `User` record
yet, same case hit live on Day 4) get incorrectly blocked from ever making
their first payment. The raw phone number in the request body is
sufficient and safer for this specific limiter's purpose.

**Verified end-to-end on the live route**, not just a test endpoint: fired
5 rapid STK Push requests for the same phone number. First 3 were allowed
and correctly enqueued into Day 5's BullMQ pipeline (two of which even hit
Daraja's real "System is busy" error and correctly went through the retry
→ dead-letter path, confirming Day 5 and Day 6 work correctly layered
together). Requests 4 and 5 were correctly rejected with `429 Too Many
Requests`, before ever reaching the queue or Daraja — confirmed via Redis
(`ZCARD`, `ZRANGE`) that exactly 3 members existed, and confirmed a
TTL-driven recovery test correctly returned to `true` after the window
passed, with old entries cleaned up rather than persisting indefinitely.

**Debugging note:** hit a real Lua syntax error (`ERR Wrong number of args
calling Redis command from script`) — Redis's own error message included
the exact malformed line, revealing a missing `key` argument in the
`ZREMRANGEBYSCORE` call. A reminder that unfamiliar-tool errors are often
ordinary typos, not something exotic — read the actual error text before
assuming the new technology itself is the problem.

### Day 1 - idempotency Reasoning

- Atomic: It checks which request arrived first, if it's a new request then yes it's the first request but if it already exists then no, it's not the first request in our cache.
- 30 second timer on the redis set method, claim() service: This checks if the request is within the the 30 second period. If it's past that then something went wrong, try again later.
- 24 hour timer on the redis set method, complete() service: This is all about Safaricom callback or any other callback sending request to our callback route. If the said callback gets the same key, then don't accept it again.
- Server crashing mid-session: If it happens then the request is gone and nothing resumes it automatically. Though if the server resumes processing within the 30 second period, a retry get rejected. But, if its past 30 second period, then the request get treated as a brand new request.
- Two separate redis boxes: This means, two processes and two sessions for one payment request by two redis servers. The danger from this is that the two redis servers process the same payment request as the first one in each redis server cache and without checking from each other, it results to double credit or debit to customer
- Duplicate processing: This means double entry and it results to the customer being debited or credited twice for one real payment request.

### Day 2 — Double-Entry Ledger Schema & LedgerService

- Modeled Account, Transaction, and LedgerEntry using double-entry accounting
  principles instead of a naive mutable `balance` column
- Account represents identity only (a wallet, platform fee account, or M-Pesa
  settlement account) — it stores no balance
- Transaction is a pure grouping container — it has no amount and touches no
  single account directly, since a real transaction (e.g. a payment with a
  platform fee) can touch multiple accounts with different amounts each
- LedgerEntry is the single source of truth: one row per account touched,
  recording the amount and direction (DEBIT/CREDIT) for that specific movement
- A balance is never stored — it's always derived by summing an account's
  ledger entries. This makes the books self-auditing: there's only ever one
  source of truth, so balance and history can never silently disagree
- Reasoned through why per-entry balance snapshots (if added later, for read
  performance) are a different risk than a mutable Account.balance field —
  a snapshot is written once and never touched again, so it can't drift from
  the ledger the way an independently-updatable field can

**Built `LedgerService.recordTransaction()`:**

- Accepts a full set of proposed ledger entries up front (account, amount,
  direction) rather than exposing separate credit/debit methods — this makes
  it structurally impossible for a caller to write an unbalanced transaction,
  since there's only one door in and it enforces the check itself
- Validates `sum(DEBIT) === sum(CREDIT)` using Prisma.Decimal arithmetic
  (never native JS numbers, to avoid floating-point precision issues with
  money) before writing anything
- Wraps the Transaction and all LedgerEntry creation in a single
  `prisma.$transaction()` — if any write fails, everything rolls back,
  guaranteeing no partial/orphaned data ever persists
- Tested both paths: a balanced 3-entry transaction (M-Pesa settlement debit,
  wallet credit, platform fee credit) committed successfully with all entries
  correctly linked; a deliberately unbalanced transaction was rejected with a
  400 before touching the database, verified via Prisma Studio that zero rows
  were written on failure

**Debugging notes (Prisma 7 specific):**

- The same generator no longer implicitly reads DATABASE_URL from the
  schema's datasource block at runtime — PrismaService now explicitly
  constructs a PrismaPg driver adapter (@prisma/adapter-pg) with the
  connection string, and passes that adapter into the PrismaClient
  constructor, rather than relying on Prisma's built-in query engine to
  manage the connection itself

### Day 3 — M-Pesa STK Push Integration

- Built MpesaService: OAuth token retrieval, STK Push initiation, all
  tested against Safaricom's real sandbox (not mocked)
- Cached access tokens in Redis using a fixed key, checking cache before
  ever calling Daraja — avoids unnecessary network calls and respects
  Safaricom's rate limits on token generation
- Used a safety-margin TTL (3300s) instead of Daraja's full 3600s token
  life, to avoid a token expiring mid-flight between cache read and
  Safaricom's request processing
- Implemented Daraja's exact Password field requirement: base64 of
  shortcode + passkey + timestamp, concatenated with no separators —
  a strict format that silently fails if built incorrectly
- Learned generateTimestamp() needs getMonth() + 1 (0-indexed months)
  and getDate() (not getDay(), which returns weekday) — both zero-padded
  to match Daraja's required YYYYMMDDHHmmss shape exactly
- Designed normalizePhoneNumber() to defensively accept common Kenyan
  phone formats (0712..., +254712..., spaced/dashed) and convert to
  Daraja's strict 2547XXXXXXXX requirement, rather than pushing that
  responsibility onto every caller — DTO validates basic shape only,
  service owns the actual business format rule
- Verified end-to-end: successful STK Push against sandbox test number,
  confirmed normalization works for both 0-prefixed and 254-prefixed
  input, confirmed invalid input is rejected with a clean 400 before
  ever reaching Daraja
- Next: the STK Push callback — parsing Safaricom's async payment
  result, applying the Day 1 idempotency guard (keyed on
  CheckoutRequestID from the callback body, not a header), and calling
  LedgerService.recordTransaction() to record the real payment

### Day 4 — M-Pesa Callback: Idempotency + Ledger Integration (in progress)

- Adapted the Day 1 idempotency pattern for webhook-style callbacks that
  carry no header, extracting CheckoutRequestID from the nested Daraja
  callback body instead
- Resolved phone number -> wallet Account via the User relation, with an
  important fix: querying Prisma with `userId: user?.id` where user could
  be null resolves to `undefined`, which Prisma treats as "no filter" —
  silently returning an unrelated account instead of throwing. Fixed by
  checking user existence explicitly before any account lookup
- Extended Transaction with M-Pesa reference fields (unique constraints
  as a DB-level backstop under the Redis idempotency guard)
- Verified live against Safaricom's sandbox: real STK Push, real ngrok-
  delivered callback, correct handling of a failed/timed-out payment
  (zero ledger writes, as designed)
- Open for next session: confirm a genuine successful payment writes a
  correctly balanced Transaction + 2 LedgerEntry rows; run the duplicate-
  callback test to prove the idempotency guarantee on the real M-Pesa
  flow; resolve an intermittent 404/201 alternation on the callback
  route (suspected stale process on port 3000)

  **Verified end-to-end against Safaricom's live sandbox:**

- A real STK Push from a real phone triggered a real callback, delivered
  through ngrok, correctly parsed, resolved to the paying user's wallet,
  and recorded as a balanced Transaction (2 LedgerEntry rows) with
  Safaricom's MpesaReceiptNumber preserved
- Resent the identical real callback payload a second time — confirmed
  via Prisma Studio that exactly 1 Transaction and 2 LedgerEntry rows
  exist, proving the idempotency guard holds on a genuine duplicate,
  not just a synthetic test
- Root-caused an earlier alternating 404/201 pattern: STK Push requests
  capture CallBackURL at initiation time, so requests made before a
  mid-session .env fix delivered their callbacks to a stale path later
  — not a routing bug, an artifact of iterating on config live
- Known gap (deliberately deferred to Day 7): a successful M-Pesa
  payment for an unregistered phone number currently returns a 404,
  which would cause Safaricom to retry indefinitely for money that
  already moved into the settlement account with no ledger attribution
  — this exact scenario is what reconciliation is designed to catch

### Day 5 — BullMQ Retries, Exponential Backoff, and Dead-Letter Capture

**Problem:** the STK Push initiation call to Daraja was synchronous and inline
— a transient timeout, 500, or dropped connection meant the request simply
failed, with no automatic retry and no visibility if it failed permanently.

**Built:**

- `MpesaStkPushQueueService` — a producer that enqueues STK Push requests
  onto a BullMQ queue instead of calling Daraja inline
- `MpesaStkPushProcessor` — a `WorkerHost` that pulls jobs off the queue and
  calls the existing `MpesaService.initiateSTKPush()`, unchanged — all retry
  logic is handled by BullMQ, not hand-written
- `DeadLetter` Prisma model — captures jobs that exhaust all retry attempts,
  since BullMQ has no built-in dead-letter queue primitive; this is the
  documented community pattern (listen on the worker's `failed` event, check
  `attemptsMade` against the configured max, write a record only once
  genuinely exhausted)

**Key design decisions, reasoned through:**

- **2 attempts, 1s exponential backoff** — deliberately short. STK Push
  initiation is synchronous and user-facing: a real customer is watching a
  loading state, waiting for the PIN prompt to appear. Long backoff (e.g. 5s
  base, 3 attempts = ~35s worst case) optimizes for giving a struggling API
  time to recover, but does nothing for Safaricom's actual recovery time and
  only makes the customer wait longer before either succeeding or seeing a
  clear failure. Short backoff suits a brief, one-off network blip; a
  background job with no one watching (e.g. reconciliation, Day 7) would
  warrant the opposite — longer, more patient backoff.
- **`DeadLetter.transactionId` is optional** — an STK Push initiation that
  never gets past the first request has no `Transaction` row yet (that's
  only created later, from a successful callback via `recordTransaction()`).
  A dead letter from initiation failure legitimately has nothing to link to;
  forcing a required relation here would make the exact failure case this
  table exists for impossible to record correctly.

### Day 7 — Reconciliation Engine

**Problem:** every prevention mechanism built so far (idempotency, atomic
ledger writes, retries, rate limiting) can still miss something -- a
server crash at the wrong instant, a payment succeeding on Safaricom's
side with nothing recorded locally (the exact gap found live on Day 4).
Reconciliation is the safety net that detects, after the fact, what
prevention didn't catch.

**Built:** ReconciliationService comparing the ledger against a mock
M-Pesa statement across four states -- MATCHED, AMOUNT_MISMATCH,
MISSING_IN_LEDGER, MISSING_IN_STATEMENT -- using a two-pass design,
since a single direction of comparison can only ever discover
discrepancies in that one direction.

**Key design decisions:**

- Normalized all amounts to `Prisma.Decimal` before comparing with
  `.equals()`, never `===` -- avoids false mismatches purely from
  formatting differences between a database Decimal and a raw
  statement value
- Selected the ledger's CREDIT entry specifically (not array position)
  to represent "the amount that reached the customer" -- robust once
  fee entries exist
- Persisted findings without a unique constraint on receipt number --
  each scheduled run is its own historical record, not an overwritten
  latest state, which matters for a genuine audit trail
- Scheduled hourly via `@nestjs/schedule`, with loud logging on any
  non-MATCHED result so issues surface in real-time logs, not only
  via a later database query

**Verified against real data:** ran against actual Transaction/
LedgerEntry rows plus a deliberately crafted mock statement (one real
match, one deliberately wrong amount, one fabricated missing receipt,
two real transactions absent from the statement) -- all four states
correctly identified in one run, confirmed both via API response and
directly in Prisma Studio's ReconciliationRecord table.
