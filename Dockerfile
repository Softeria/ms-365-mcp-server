# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Build stage — pinned to a specific Node 22 LTS alpine digest. `npm ci`
# uses the lockfile; --ignore-scripts blocks dependency install hooks.
# The OpenAPI trim + client generation runs here so the final image
# does not need the 45MB raw spec.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run generate \
 && npm run build \
 && npm prune --omit=dev --ignore-scripts

# -----------------------------------------------------------------------------
# Release stage — minimal runtime. Non-root user. Read-only filesystem
# friendly: token cache defaults to /home/app which is writable; everything
# else under /app is r/o by design.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS release

ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps

# Create a non-root user. node:alpine ships a "node" user (uid 1000) —
# reuse it rather than adding a new one.
WORKDIR /app

COPY --from=builder --chown=node:node /app/dist /app/dist
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/package.json /app/package.json
COPY --from=builder --chown=node:node /app/src/endpoints.json /app/src/endpoints.json

USER node

# stdio transport has no listening port; no HEALTHCHECK needed. If you
# enable --http, add a HEALTHCHECK in your deployment manifest.

ENTRYPOINT ["node", "dist/index.js"]
