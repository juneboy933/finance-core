# syntax=docker/dockerfile:1

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

# ---- Stage 2: runner ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/generated

EXPOSE 3000

CMD ["node", "dist/main"]