# Fintech Core

A production-grade fintech backend built to demonstrate the engineering practices
that matter in real payment systems: idempotent processing, double-entry ledger
accounting, M-Pesa integration, reliable async processing, and observability —
built incrementally, one focused module at a time.

**Stack:** NestJS · Prisma · PostgreSQL · Redis · BullMQ · Docker

## Why this exists

Most portfolio projects prove you can build CRUD APIs. This one is built to prove
something different: that I understand the specific failure modes that matter
when software moves real money — duplicate processing, race conditions, silent
data corruption, and the operational discipline (testing, CI/CD, observability)
that keeps payment systems trustworthy at scale.

## Local development setup

### Prerequisites

- Node.js (version)
- Docker Desktop (with WSL2 backend, if on Windows)

### Getting started

1. Clone the repo and install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Copy the environment template and fill in real values:
   \`\`\`
   cp .env.example .env
   \`\`\`

3. Start local infrastructure (Postgres + Redis):
   \`\`\`
   docker compose up -d
   docker compose ps # confirm both services show "healthy"
   \`\`\`

4. Verify database connectivity:
   \`\`\`
   npx prisma db pull
   \`\`\`

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

### Day 1 - idempotency Reasoning

- Atomic: It checks which request arrived first, if it's a new request then yes it's the first request but if it already exists then no, it's not the first request in our cache.
- 30 second timer on the redis set method, claim() service: This checks if the request is within the the 30 second period. If it's past that then something went wrong, try again later.
- 24 hour timer on the redis set method, complete() service: This is all about Safaricom callback or any other callback sending request to our callback route. If the said callback gets the same key, then don't accept it again.
- Server crashing mid-session: If it happens then the request is gone and you get to process it again. Though if the server resumes processing within the 30 second period, a retry get rejected. But, if its past 30 second period, then the request get treated as a brand new request.
- Two separate redis boxes: This means, two processes and two sessions for one payment request by two redis servers. The danger from this is that the two redis servers process the same payment request as the first one in each redis server cache and without checking from each other, it results to double credit or debit to customer
- Duplicate processing: This means double entry and it results to the customer being debited or credited twice for one real payment request.
