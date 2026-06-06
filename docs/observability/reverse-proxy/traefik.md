# Traefik Reverse Proxy — ms-365-mcp-server v2

Traefik is documented as a SECONDARY alternative. Use when your deployment is Docker Compose + you want label-based service discovery + auto-HTTPS without Caddy.

Traefik handles streaming reasonably out-of-the-box (unlike nginx, it defaults to HTTP/2 and does not buffer SSE when Content-Type is `text/event-stream`). No special `buffering off` flag — but VERIFY Content-Type is set correctly on the SSE route.

## Reference docker-compose labels

```yaml
services:
  ms-365-mcp-server:
    # Pin a sha-* tag or digest in production. If you intentionally track
    # latest, add pull_policy: always so redeploys fetch the moving tag.
    image: ghcr.io/softeria/ms-365-mcp-server:sha-<shortsha>
    environment:
      - MS365_MCP_PROMETHEUS_ENABLED=1
      - MS365_MCP_METRICS_BEARER=replace-me-with-random-32-bytes
      # ... other env
    labels:
      - 'traefik.enable=true'

      # Main MCP surface
      - 'traefik.http.routers.mcp.rule=Host(`mcp.example.com`) && !PathPrefix(`/admin`)'
      - 'traefik.http.routers.mcp.entrypoints=websecure'
      - 'traefik.http.routers.mcp.tls.certresolver=letsencrypt'
      - 'traefik.http.routers.mcp.service=mcp@docker'
      - 'traefik.http.services.mcp.loadbalancer.server.port=3000'
      # Long-lived timeout for MCP streams (default is 0 = unlimited for read, 1m for idle).
      - 'traefik.http.services.mcp.loadbalancer.responseforwarding.flushInterval=100ms'

      # Security headers
      - 'traefik.http.middlewares.mcp-sec.headers.stsSeconds=31536000'
      - 'traefik.http.middlewares.mcp-sec.headers.stsIncludeSubdomains=true'
      - 'traefik.http.middlewares.mcp-sec.headers.contentTypeNosniff=true'
      - 'traefik.http.middlewares.mcp-sec.headers.frameDeny=true'
      - 'traefik.http.middlewares.mcp-sec.headers.referrerPolicy=strict-origin-when-cross-origin'
      - 'traefik.http.routers.mcp.middlewares=mcp-sec@docker'

      # Metrics — separate router with IP allowlist (Prometheus only).
      - 'traefik.http.routers.metrics.rule=Host(`metrics.example.com`)'
      - 'traefik.http.routers.metrics.entrypoints=websecure'
      - 'traefik.http.routers.metrics.tls.certresolver=letsencrypt'
      - 'traefik.http.routers.metrics.middlewares=ip-allowlist@docker'
      - 'traefik.http.routers.metrics.service=metrics@docker'
      - 'traefik.http.services.metrics.loadbalancer.server.port=9464'
      - 'traefik.http.middlewares.ip-allowlist.ipallowlist.sourcerange=10.0.0.0/8'

      # Admin — separate router typically behind Entra SSO or IP allowlist.
      - 'traefik.http.routers.admin.rule=Host(`admin.example.com`)'
      - 'traefik.http.routers.admin.entrypoints=websecure'
      - 'traefik.http.routers.admin.tls.certresolver=letsencrypt'
      - 'traefik.http.routers.admin.middlewares=ip-allowlist@docker'
      - 'traefik.http.routers.admin.service=admin@docker'
      - 'traefik.http.services.admin.loadbalancer.server.port=3000'
```

## SSE Verification

```bash
curl -N https://mcp.example.com/t/tenant-a/sse
```

Events should stream. Traefik's default `responseforwarding.flushInterval=100ms` is acceptable for SSE; set to a smaller value if you need tighter latency.

## Notes

- `flushInterval=100ms` is the Traefik equivalent of Caddy's `flush_interval`. Default (`0s` = no explicit flush) buffers per-connection — set this for streaming routes.
- Traefik's HTTP/2 support is automatic for TLS routes.
- Let's Encrypt cert resolver requires the `certresolver` be configured globally in `traefik.yml`.
- Middleware chaining via `@docker` provider is a Docker Compose convention — adjust for other providers (file, Kubernetes, etc.).
- Keep router and service references in the same provider namespace. Do not point file-provider routers at Docker/Coolify-generated services (or vice versa); during deploy churn Traefik can resolve those cross-provider names before the target service exists and return intermittent missing-backend errors.
