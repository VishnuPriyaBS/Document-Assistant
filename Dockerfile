# Stage 1: Install dependencies
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund


# Stage 2: Build the Next.js application
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build


# Stage 3: Run the application
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./

COPY --from=builder /app/next.config.ts ./next.config.ts

COPY --from=builder /app/public ./public

COPY --from=builder /app/.next ./.next

COPY --from=deps /app/node_modules ./node_modules

# Remove development dependencies
# Prepare writable document storage
RUN npm prune --omit=dev --no-audit --no-fund \
    && mkdir -p /app/.local-documents \
    && chown -R node:node /app/.local-documents /app/.next

USER node

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]