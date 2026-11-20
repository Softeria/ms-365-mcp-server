FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run generate
RUN npm run build

FROM node:24-alpine AS release

WORKDIR /app

COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
RUN npm ci --ignore-scripts --omit=dev

COPY --from=builder /app/dist /app/dist

# The process holds tenant-scoped Graph credentials, so it runs as the unprivileged
# `node` user. /app is handed to it because the server may write runtime state
# (the token cache, the selected account) to the working directory.
RUN chown -R node:node /app
USER node

ENTRYPOINT ["node", "dist/index.js"]
