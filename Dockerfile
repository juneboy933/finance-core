# syntax=docker/dockerfile:1

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (argon2, bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Set node-gyp mirror URL via environment variable & configure npm retry limits
ENV NODEJS_ORG_MIRROR=https://nodejs.org/dist

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies)
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

# Prune devDependencies so node_modules only contains production packages
RUN npm prune --omit=dev

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

# Set node environment
ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Copy pre-compiled production dependencies and build artifacts from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/generated

EXPOSE 3000

CMD ["node", "dist/main"]