# MS365 MCP Server — OAuth Proxy 構成ガイド

ユーザーに渡す情報は **MCP の URL 1 つだけ**。Azure Entra のテナント ID・クライアント ID はサーバー側に秘匿する構成。

---

## アーキテクチャ概要

```
┌──────────────────────────────────────┐
│  MCP クライアント                     │
│  (Claude Code / GitHub Copilot)      │
│  知っているのは MCP URL のみ          │
└──────────────┬───────────────────────┘
               │ http://localhost:8080/mcp
               ▼
┌──────────────────────────────────────┐
│         OAuth Proxy (port 8080)      │
│                                      │
│  /.well-known/oauth-protected-resource│
│  /.well-known/oauth-authorization-server│
│  POST /register   ← DCR (RFC 7591)  │
│  GET  /authorize  → Entra へ転送    │
│  GET  /entra-callback ← Entra から  │
│  POST /token      → JWT を発行      │
│  ALL  /mcp        → backend へ転送  │
└──────────────┬───────────────────────┘
               │ Authorization: Bearer <Graph token>
               ▼
┌──────────────────────────────────────┐
│  ms-365-mcp-server (port 3000)       │
│  localhost のみ公開                   │
└──────────────┬───────────────────────┘
               │
               ▼
        Microsoft Graph API
```

---

## 認証フロー（初回）

```mermaid
sequenceDiagram
    participant C as MCP クライアント<br/>(Claude Code / Copilot)
    participant P as OAuth Proxy<br/>:8080
    participant E as Azure Entra ID
    participant B as ms-365-mcp-server<br/>:3000
    participant G as Microsoft Graph API

    %% Step 1: 未認証アクセス → 401
    C->>P: POST /mcp (token なし)
    P-->>C: 401 Unauthorized<br/>WWW-Authenticate: Bearer resource_metadata=<br/>"http://localhost:8080/.well-known/oauth-protected-resource"

    %% Step 2: PRM 探索
    C->>P: GET /.well-known/oauth-protected-resource
    P-->>C: { authorization_servers: ["http://localhost:8080"] }

    %% Step 3: AS メタデータ探索
    C->>P: GET /.well-known/oauth-authorization-server
    P-->>C: { authorization_endpoint, token_endpoint,<br/>registration_endpoint, ... }

    %% Step 4: DCR (Dynamic Client Registration)
    C->>P: POST /register<br/>{ redirect_uris, client_name, ... }
    P-->>C: { client_id: "dyn-xxxx", ... }

    %% Step 5: 認可リクエスト
    C->>P: GET /authorize?client_id=dyn-xxxx<br/>&code_challenge=...&state=...
    Note over P: internalState を生成して<br/>pendingStates に保存

    %% Step 6: Entra へリダイレクト
    P-->>C: 302 → Entra /authorize<br/>(scope をハードコードして補完)
    C->>E: ブラウザで Entra ログイン画面
    Note over C,E: ユーザーが資格情報を入力

    %% Step 7: Entra コールバック
    E-->>P: GET /entra-callback?code=entra_code&state=internalState
    P->>E: POST /token (code=entra_code, client_id, client_secret)
    E-->>P: { access_token (Graph), refresh_token }

    %% Step 8: プロキシコード発行
    Note over P: proxyCode を生成<br/>Graph token を pendingCodes に保存 (5分)
    P-->>C: 302 → redirect_uri?code=proxyCode&state=...

    %% Step 9: トークン交換
    C->>P: POST /token<br/>{ grant_type=authorization_code, code=proxyCode,<br/>code_verifier }
    Note over P: PKCE (S256) 検証
    Note over P: proxyCode → Graph token を取得
    P-->>C: { access_token: <Proxy JWT>,<br/>refresh_token: <Entra refresh_token>,<br/>expires_in: 3600 }

    %% Step 10: MCP アクセス
    C->>P: POST /mcp<br/>Authorization: Bearer <Proxy JWT>
    Note over P: JWT を検証して<br/>graphAccessToken を取り出す
    P->>B: POST /mcp<br/>Authorization: Bearer <Graph token>
    B->>G: Microsoft Graph API 呼び出し
    G-->>B: Graph レスポンス
    B-->>P: MCP レスポンス
    P-->>C: MCP レスポンス
```

---

## トークンリフレッシュフロー

```mermaid
sequenceDiagram
    participant C as MCP クライアント
    participant P as OAuth Proxy
    participant E as Azure Entra ID

    Note over C: Proxy JWT が期限切れ (1時間)
    C->>P: POST /token<br/>{ grant_type=refresh_token,<br/>refresh_token=<Entra refresh_token> }
    P->>E: POST /token<br/>{ grant_type=refresh_token, refresh_token,<br/>client_id, client_secret }
    E-->>P: { access_token (新Graph token), refresh_token }
    Note over P: 新しい Proxy JWT を署名
    P-->>C: { access_token: <新Proxy JWT>,<br/>refresh_token: <新Entra refresh_token> }
```

---

## コンポーネント詳細

### OAuth Proxy (`proxy/proxy.js`)

| エンドポイント | 役割 |
|---|---|
| `GET /.well-known/oauth-protected-resource` | Proxy 自身を AS として宣言 |
| `GET /.well-known/oauth-authorization-server` | OAuth メタデータ（DCR エンドポイント含む）|
| `POST /register` | Dynamic Client Registration (RFC 7591) |
| `GET /authorize` | Entra /authorize へリダイレクト（scope を補完）|
| `GET /entra-callback` | Entra からのコールバック受信、プロキシコード発行 |
| `POST /token` | PKCE 検証 → Proxy JWT 発行 / refresh_token 更新 |
| `ALL /mcp` | JWT 検証 → Graph token に差し替えてバックエンドへ転送 |
| `GET /health` | ヘルスチェック |

### ms-365-mcp-server (`src/`)

- HTTP Bearer モードで起動（`--http 127.0.0.1:3000`）
- `Authorization: Bearer <Graph token>` を受け取り Graph API を呼び出す
- **外部に直接公開しない**（localhost のみ）

---

## セキュリティ設計

| 脅威 | 対策 |
|---|---|
| Entra 認証情報の漏洩 | Proxy のみが client_id / client_secret を保持 |
| CSRF 攻撃 | state パラメーター（internalState）で防止 |
| 認可コードの横取り | PKCE (S256) で防止 |
| プロキシコードの使い回し | 使用後即座に削除、5分で期限切れ |
| JWT の改ざん | HMAC-SHA256 署名 (jose ライブラリ) |
| バックエンドへの直接アクセス | localhost バインドで外部公開しない |
| トークンのログ漏洩 | UPN のみログ出力、token 値は出力しない |

---

## 既知の問題と対策

### Claude Code — scope パラメーター未送信バグ (Issue #4540)

**症状**: OAuth 認可リクエストに `scope` が含まれない場合がある。  
**対策**: Proxy の `/authorize` で `graphScopes` をハードコードして Entra に送信。

### Entra ID — DCR 非対応

**症状**: Entra は RFC 7591 をサポートしない。  
**対策**: Proxy 自身が `/register` エンドポイントを実装してクライアントを動的発行。

### インメモリストアの制限

`dynamicClients` / `pendingStates` / `pendingCodes` はメモリ上に保持。  
プロセス再起動で消えるため、本番運用では Redis 等に置き換える。

| ストア | 推奨 TTL |
|---|---|
| `dynamicClients` | 無期限（または長期）|
| `pendingStates` | 10 分 |
| `pendingCodes` | 5 分 |

---

## 起動方法

```bash
# 1. ms-365-mcp-server 起動 (port 3000)
pnpm dev:http
# → 127.0.0.1:3000 でリッスン

# 2. OAuth Proxy 起動 (port 8080)
cd proxy
cp .env.example .env   # Entra 情報を記入
node proxy.js
# → 0.0.0.0:8080 でリッスン

# 3. MCP クライアントに登録
# Claude Code
claude mcp add --transport http ms365 http://localhost:8080/mcp

# GitHub Copilot (VS Code)
# .vscode/mcp.json に以下を追記:
# { "servers": { "ms365": { "type": "http", "url": "http://localhost:8080/mcp" } } }
```

## 接続確認

```bash
# PRM エンドポイント（Proxy 自身が AS として返ること）
curl http://localhost:8080/.well-known/oauth-protected-resource

# AS メタデータ（registration_endpoint が含まれること）
curl http://localhost:8080/.well-known/oauth-authorization-server

# 未認証アクセス → 401 + WWW-Authenticate ヘッダー
curl -i -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# ヘルスチェック
curl http://localhost:8080/health
```

---

## 必要な Entra アプリ設定

| 設定項目 | 値 |
|---|---|
| アプリの種類 | パブリッククライアント または 機密クライアント |
| リダイレクト URI | `http://localhost:8080/entra-callback` |
| サポートするアカウント | シングルテナント（社内利用推奨）|
| API のアクセス許可 | User.Read, Mail.*, Calendars.*, Files.* 等（管理者の同意推奨）|
