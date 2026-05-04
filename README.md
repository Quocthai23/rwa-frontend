# MTX Web

Web application built with [Next.js](https://nextjs.org) 16 (App Router), React 19, and TypeScript. npm package name: `mtx`.

## Requirements

| Tool    | Suggested version                                                 |
| ------- | ----------------------------------------------------------------- |
| Node.js | 20+ recommended for Next 16; Docker image uses **Node 25** Alpine |
| Yarn    | 1.x (lockfile: `yarn.lock`)                                       |
| Docker  | Optional; Docker Compose v2 + BuildKit                            |

## Quick start (local)

```bash
cp .env.example .env
# Fill in all values in .env (see table below)

yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects `/` → `/home` (see `next.config.ts`).

## Environment variables

Copy `.env.example` to `.env` and replace the placeholders.

| Variable                                    | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in (NextAuth)                        |
| `NEXTAUTH_URL`                              | Canonical app URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET`                           | Secret for signing NextAuth sessions             |
| `WS_TICKET_SECRET`                          | Signing WebSocket tickets (`ws-ticket` API)      |
| `NEXT_PUBLIC_API_CHART_URL`                 | Chart API (browser)                              |
| `NEXT_PUBLIC_SOCKET_CHART_URL`              | Chart socket (browser)                           |
| `NEXT_PUBLIC_API_BASE_URL`                  | Backend API base URL (browser)                   |
| `NEXT_PUBLIC_WS_ORDER_URL`                  | Order WebSocket URL (browser)                    |

**Docker / production:** `NEXT_PUBLIC_*` values are **baked into the client bundle at `docker compose build` time**. Changing them in `.env` without rebuilding the image leaves the client on the old values. Server-only variables (`GOOGLE_*`, `NEXTAUTH_*`, `WS_TICKET_SECRET`, etc.) are read **at container runtime** via `env_file: .env`.

## Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `yarn dev`    | Next.js development server                                                     |
| `yarn build`  | Production build (`next build`; `output: "standalone"` is required for Docker) |
| `yarn start`  | Run the production build (`next start`)                                        |
| `yarn lint`   | ESLint                                                                         |
| `yarn format` | Prettier for `src/**/*.{ts,tsx,json,css,md}`                                   |

## Docker

### Overview

- **Dockerfile:** multi-stage (`deps` → `builder` → `runner`), base `node:25-alpine`, non-root user `nextjs`, `dumb-init` entrypoint.
- **Build:** `yarn install --frozen-lockfile`, then `yarn build` with a cache mount on `.next/cache`.
- **Runtime image:** copies only `standalone` output, static assets, and `public` (smaller than shipping full `node_modules`).
- **Prod Compose** (`docker-compose.yml`): image `mtx-web:prod`, container `mtx-web`, **no** published port by default (typical behind a reverse proxy on the same host/network).
- **Dev Compose** (`docker-compose.dev.yml`): image `mtx-web:dev`, container `mtx-web-dev`, publishes **`${WEB_PORT:-3000}:3000`**.

### Build images

Ensure `.env` defines all `NEXT_PUBLIC_*` variables before building (Compose passes them as build args).

```bash
# Production tag
docker compose -f docker-compose.yml build web

# Dev tag (same Dockerfile, different tag)
docker compose -f docker-compose.dev.yml build web
```

### Run containers

```bash
# Production
docker compose -f docker-compose.yml up -d web

# Development (HTTP on port 3000 or WEB_PORT)
docker compose -f docker-compose.dev.yml up -d web
```

### Manual build (without Compose)

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_CHART_URL="$NEXT_PUBLIC_API_CHART_URL" \
  --build-arg NEXT_PUBLIC_SOCKET_CHART_URL="$NEXT_PUBLIC_SOCKET_CHART_URL" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
  --build-arg NEXT_PUBLIC_WS_ORDER_URL="$NEXT_PUBLIC_WS_ORDER_URL" \
  -t mtx-web:local .
```

Run with runtime env (e.g. from `.env`):

```bash
docker run --rm -p 3000:3000 --env-file .env mtx-web:local
```

### Healthcheck

Compose uses `wget` to probe `http://127.0.0.1:3000` inside the container. `shm_size: 256mb` reduces the chance of crashes under memory pressure during heavy SSR.

### Related files

| File                     | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `Dockerfile`             | Image definition                                               |
| `docker-compose.yml`     | Production: `mtx-web:prod`                                     |
| `docker-compose.dev.yml` | Development: `mtx-web:dev` + port mapping                      |
| `.dockerignore`          | Smaller build context (excludes `node_modules`, `.next`, etc.) |

## Source layout (summary)

- `src/app/` — App Router pages and API routes (`src/app/api/`)
- `src/components/` — UI (featured, shared, layout, etc.)
- `src/services/`, `src/hook/`, `src/store/` — API clients, hooks, Zustand stores
- `src/constants/env.ts` — typed/documented environment access
- `public/` — static assets

## Further reading

- [Next.js Documentation](https://nextjs.org/docs)
- [Dockerizing Next.js (standalone)](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)
"# rwa-frontend" 
