# syntax=docker/dockerfile:1.7
#
# AstralChat — multi-stage image.
# AWS credentials are NEVER baked in. They must be supplied at runtime
# via --env-file or -e so the image itself is safe to publish/share.
#
# Build:  docker build -t astralchat .
# Run:    docker run --rm -p 3000:3000 --env-file .env.docker astralchat

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat helps some native modules find their expected loader on alpine.
RUN apk add --no-cache libc6-compat

# Skip Puppeteer's Chromium download — not used by the app, saves ~300 MB.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root runtime user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone bundle (server.js + traced node_modules) + static assets + public assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Defensively pull in native / externalized packages Next.js marks as
# `serverExternalPackages`. The NFT tracer usually catches them, but copying
# them explicitly avoids runtime "Cannot find module" surprises with the
# canvas/pdfjs worker paths that resolve via process.cwd().
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@napi-rs ./node_modules/@napi-rs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdf-parse ./node_modules/pdf-parse

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
