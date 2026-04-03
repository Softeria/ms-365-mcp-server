# ── Stage 1: Build backend ────────────────────────────────────────────────────
FROM node:24-slim AS builder

COPY ak.pem /usr/local/share/ca-certificates/ak.crt
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/ak.crt

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run generate && pnpm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:24-slim

COPY ak.pem /usr/local/share/ca-certificates/ak.crt
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dumb-init \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/ak.crt

WORKDIR /app

# Backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Proxy
COPY proxy/package.json proxy/proxy.js ./proxy/
RUN cd proxy && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bash", "-c", "node dist/index.js --http 127.0.0.1:3000 --org-mode & cd /app/proxy && node proxy.js & wait -n"]
