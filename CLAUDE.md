# @ixtria/outlook-mcp-hardened

## Qu'est-ce que c'est ?

Fork hardening de `@softeria/ms-365-mcp-server` (MIT) pour exposer Microsoft Outlook (Mail + Calendar) via MCP, avec un focus sécurité et transparence adapté aux PME suisses (nFADP-compatible).

Publié en OSS sous licence Apache-2.0 par Ixtria.

## Principes non-négociables

1. **Minimalisme** : Mail + Calendar uniquement. Rien d'autre.
2. **Read-first** : `Mail.Send` désactivé par défaut, activable via `--enable-send`. `Calendars.ReadWrite` via `--enable-write`.
3. **Egress allowlist hardcodée** : seuls `login.microsoftonline.com` et `graph.microsoft.com` sont autorisés. Toute autre connexion sortante = crash immédiat au boot.
4. **Zéro télémétrie** : aucun Sentry, aucun analytics, aucun phone-home. `grep fetch|http` sur le code doit donner 100% Graph.
5. **Audit trail structuré** : chaque appel Graph loggé en JSON sur stderr (timestamp, tool, scope, account hash, status).
6. **Anti-prompt-injection** : body mail retourné wrappé dans `<untrusted_content>` + warning dans la description du tool.
7. **Tokens locaux uniquement** : `keytar` (OS keychain) ou fichier chiffré AES-256 en fallback. Jamais en clair.

## Stack

- TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- Runtime : Node.js 20 LTS
- MCP SDK : `@modelcontextprotocol/sdk`
- Auth : `@azure/msal-node` (device code flow)
- HTTP client : `fetch` natif (undici sous le capot Node 20+)
- Tests : `vitest`
- Lint : `eslint` + `@typescript-eslint` strict

## Stack interdite

- Pas de Bun, Deno. `tsc` + `tsx` suffisent.
- Pas de ORM, pas de DB.
- Pas de dépendance avec plus de 3 niveaux transitifs sans justification.
- Pas de `axios`, `node-fetch`, `express` (sauf si mode HTTP réactivé).

## Architecture

```
src/
  auth.ts              # MSAL device code flow, multi-account (upstream modifié)
  auth-tools.ts        # Tools MCP auth (upstream modifié, +auth_status)
  graph-client.ts      # Wrapper Graph API (upstream modifié, +egress guard, +audit)
  graph-tools.ts       # Registration tools MCP (upstream modifié, +injection wrapper)
  endpoints.json       # ~58 endpoints Mail+Calendar (upstream filtré, de 202)
  server.ts            # MCP server (upstream modifié, HTTP gated)
  cli.ts               # CLI (upstream modifié, +--enable-send/write)
  security/
    egress-guard.ts    # Allowlist réseau — NOUVEAU
    audit-logger.ts    # JSON structuré → stderr — NOUVEAU
    injection-wrapper.ts  # <untrusted_content> — NOUVEAU
  (autres fichiers upstream intacts)
```

## Workflow de développement

1. **Toujours lire PLAN.md** avant d'implémenter — il décrit fichier par fichier ce qui change.
2. **Commits atomiques** : un concern = un commit, avec tests.
3. **Branche** : `hardening/v0.1.0` pour tout le travail v0.1.
4. **Tests obligatoires** : chaque module security/ a ses tests unitaires.
5. **npm audit** : doit passer à `--audit-level=moderate` en CI.

## Conventions

- Commit messages : `type(scope): description` (conventional commits)
- Les modifications de fichiers upstream sont **chirurgicales** : minimum de lignes changées, commentaires `// HARDENED:` pour marquer chaque modification.
- Le code upstream non modifié n'est PAS reformaté/refactoré.

## Commandes

```bash
npm install                 # Installer les dépendances
npm run build               # Compiler TypeScript (tsup → dist/)
npm run dev                 # Dev mode avec tsx
npm test                    # Lancer tous les tests vitest
npm test -- <pattern>       # Un seul test (ex: npm test -- egress-guard)
npm run test:watch          # Mode watch
npm run lint                # ESLint
npm run lint:fix            # ESLint auto-fix
npm run format              # Prettier auto-fix
npm run format:check        # Prettier check (CI)
npm run verify              # Chain CI complète: generate + lint + format:check + build + test
npm run inspector           # MCP Inspector (debug visuel stdio)
```

### `npm run generate` — à lancer dès que `endpoints.json` change

Cette commande (`bin/generate-graph-client.mjs`) **utilise `endpoints.json` comme whitelist** pour trimmer l'OpenAPI Graph puis générer `src/generated/client.ts` (gitignored, ~MB). Étapes :
1. Télécharge l'OpenAPI complet Graph (`openapi/openapi.yaml`, 45MB)
2. Trimme selon les aliases listés dans `endpoints.json`
3. Génère `src/generated/client.ts` via `openapi-zod-client`

Donc **à relancer après chaque modification de `endpoints.json`** (notamment après le filtrage mail/calendar du commit #2). Les tests échouent sans `client.ts` car `graph-tools.ts` l'importe.

### Contournement `min-release-age`

Le `~/.npmrc` global peut contenir `min-release-age=259200`. **En npm 11+ cette valeur est en jours** (pas secondes), ce qui bloque `npx`/`npm install`. Contournement pour une commande : `NPM_CONFIG_MIN_RELEASE_AGE=0 npm run generate`.

## État du repo

Tant que le hardening n'est pas démarré, le repo est une copie 1:1 de `softeria/ms-365-mcp-server@0b1a2fe`. Indicateurs :

- `package.json` porte encore le nom upstream `@softeria/ms-365-mcp-server` → rename = étape B du PLAN.md
- Aucun fichier dans `src/security/` → création = étape C du PLAN.md
- Aucun commentaire `// HARDENED:` → marker à ajouter sur chaque ligne modifiée d'un fichier upstream

## Remotes Git

- `origin` → `Ixtria/outlook-mcp-hardened` (notre fork)
- `upstream` → `Softeria/ms-365-mcp-server` (upstream pour cherry-picks)

## Hors scope v0.1

- Mode HTTP (stdio uniquement)
- PKCE flow
- Attachments write (read-only OK)
- OneDrive, Teams, SharePoint, Excel
- Folders custom, règles, catégories avancées

## Outils Project-Forge disponibles

Ce projet est issu de Project-Forge (`/home/jimb/Projets/Project-Forge/`). Quelques outils PF sont pertinents ici :

- **`speckit-threat-model`** : analyse STRIDE — utile pour valider le threat model du PLAN.md
- **`speckit-archi-review`** : revue d'architecture — utile pour auditer l'upstream avant modification
- **`ralph-loop`** : implémentation autonome par commits atomiques — compatible tout projet TypeScript

Les autres outils PF (starters, production-skills, bootstrap) ne s'appliquent pas à ce projet.
