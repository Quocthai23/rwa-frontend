# syntax=docker/dockerfile:1.4

# --- Dependencies (cache-friendly install) ---
FROM node:25-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json yarn.lock ./

RUN --mount=type=cache,id=yarn,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --network-timeout 100000

# --- Build application ---
FROM node:25-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY package.json yarn.lock ./
COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Client bundle inlines these at build time
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_API_CHART_URL
ARG NEXT_PUBLIC_SOCKET_CHART_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_ORDER_URL

ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
ENV NEXT_PUBLIC_API_CHART_URL=${NEXT_PUBLIC_API_CHART_URL}
ENV NEXT_PUBLIC_SOCKET_CHART_URL=${NEXT_PUBLIC_SOCKET_CHART_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WS_ORDER_URL=${NEXT_PUBLIC_WS_ORDER_URL}

RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    yarn build

# --- Minimal production image ---
FROM node:25-alpine AS runner

RUN apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

WORKDIR /app

ARG NEXT_PUBLIC_APP_ENV
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
