FROM docker-default-virtual.bts.artifactory.tio.systems/core-container-node:22 AS builder

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://bts.artifactory.tio.systems/artifactory/api/npm/npm/ \
  NPM_CONFIG_REPLACE_REGISTRY_HOST=always \
  NPM_CONFIG_LEGACY_PEER_DEPS=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run generate
RUN npm run build

FROM docker-default-virtual.bts.artifactory.tio.systems/core-container-node:22 AS release

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://bts.artifactory.tio.systems/artifactory/api/npm/npm/ \
  NPM_CONFIG_REPLACE_REGISTRY_HOST=always \
  NPM_CONFIG_LEGACY_PEER_DEPS=true

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
RUN npm ci --ignore-scripts --omit=dev

RUN addgroup -S mcp \
  && adduser -S -D -H -G mcp -u 10001 mcp \
  && mkdir -p /home/mcp/.ms-365-mcp-server/logs \
  && chown -R mcp:mcp /app /home/mcp

ENV HOME=/home/mcp
USER 10001:10001

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--http", "3000", "--org-mode"]
