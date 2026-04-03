# ms-365-mcp-server

Microsoft 365 MCP Server（社内カスタム版）

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) サーバーで、Microsoft Graph API を介して Microsoft 365 サービス（メール、カレンダー、OneDrive、Teams、SharePoint 等）を Claude Code / Claude Desktop から操作できます。

上流リポジトリ: [Softeria/ms-365-mcp-server](https://github.com/Softeria/ms-365-mcp-server)

## アーキテクチャ

```
MCP Client (Claude Code / Claude Desktop)
  │
  │  HTTP (Streamable HTTP)
  ▼
┌──────────────────────────────────┐
│  OAuth Proxy (port 8080)         │  ← proxy/proxy.js
│  - OAuth 2.1 AS (DCR, PKCE)     │
│  - Entra ID 認可フロー           │
│  - JWT 発行・検証                │
├──────────────────────────────────┤
│  ms-365-mcp-server (port 3000)   │  ← dist/index.js --http --org-mode
│  - MCP ツール提供                │
│  - Graph API 呼び出し            │
└──────────────────────────────────┘
         │
         │  HTTPS
         ▼
  Microsoft Graph API (graph.microsoft.com)
  Microsoft Entra ID  (login.microsoftonline.com)
```

すべて単一の Docker コンテナ内で動作します。

## 前提条件

- Docker
- Azure Entra ID アプリ登録（後述）
- Claude Code または Claude Desktop

## セットアップ

### 1. Azure Entra ID アプリ登録

[Azure Portal](https://portal.azure.com) でアプリを登録します。

1. **Azure Active Directory** → **アプリの登録** → **新規登録**
2. 名前: 任意（例: `ms365-mcp`）
3. サポートされるアカウントの種類: **この組織のディレクトリ内のアカウントのみ**（シングルテナント）

登録後、以下を控えます:

| 項目 | 場所 |
|------|------|
| アプリケーション (クライアント) ID | 概要ページ |
| ディレクトリ (テナント) ID | 概要ページ |

#### リダイレクト URI の設定

**認証** → **プラットフォームの追加** → **モバイルアプリケーションとデスクトップアプリケーション**:

```
http://localhost:8080/entra-callback
```

#### パブリッククライアントフローの有効化

**認証** → **詳細設定**:

- 「パブリック クライアント フローを許可する」→ **はい**

> **注意**: クライアントシークレットは不要です（パブリッククライアントフロー使用時）。

#### API のアクセス許可

**API のアクセス許可** → **アクセス許可の追加** → **Microsoft Graph** → **委任されたアクセス許可**:

```
openid, profile, email, offline_access,
User.Read,
Mail.Read, Mail.ReadWrite, Mail.Send,
Calendars.Read, Calendars.ReadWrite,
Files.Read, Files.ReadWrite, Files.Read.All,
Notes.Read, Notes.ReadWrite,
Contacts.Read, Contacts.ReadWrite,
Tasks.Read, Tasks.ReadWrite
```

### 2. Docker イメージのビルド

```bash
docker build -t ms365-mcp .
```

### 3. コンテナの起動

```bash
docker run -d --name ms365-mcp \
  -e ENTRA_CLIENT_ID=<your-client-id> \
  -e ENTRA_TENANT_ID=<your-tenant-id> \
  -e MS365_MCP_CLIENT_ID=<your-client-id> \
  -e MS365_MCP_TENANT_ID=<your-tenant-id> \
  -e PUBLIC_URL=http://localhost:8080 \
  -p 8080:8080 \
  ms365-mcp
```

> **パブリッククライアントフロー**を使用する場合、`ENTRA_CLIENT_SECRET` は不要です。

ヘルスチェック:

```bash
curl http://localhost:8080/health
# => {"status":"ok","timestamp":"..."}
```

### 4. Claude Code への接続設定

```bash
claude mcp add ms365 -- npx mcp-remote http://localhost:8080/mcp
```

または `~/.claude.json` に直接追記:

```json
{
  "mcpServers": {
    "ms365": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8080/mcp"],
      "env": {}
    }
  }
}
```

### 5. 初回認証

Claude Code を起動（または再起動）すると、ブラウザが自動で開き Entra ID のログイン画面が表示されます。サインインすると OAuth フローが完了し、MCP ツールが利用可能になります。

## 環境変数一覧

### OAuth プロキシ (proxy/proxy.js)

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `ENTRA_CLIENT_ID` | Yes | - | Azure AD アプリのクライアント ID |
| `ENTRA_TENANT_ID` | Yes | - | Azure AD テナント ID |
| `ENTRA_CLIENT_SECRET` | No | - | クライアントシークレット（パブリッククライアント時は不要） |
| `PUBLIC_URL` | No | `http://localhost:8080` | プロキシの公開 URL |
| `MS365_MCP_URL` | No | `http://127.0.0.1:3000` | バックエンド MCP サーバーの URL |
| `JWT_SECRET` | No | ランダム生成 | JWT 署名キー |
| `PORT` | No | `8080` | プロキシのリッスンポート |
| `GRAPH_SCOPES` | No | 下記参照 | Graph API スコープ（スペース区切り） |

### MCP サーバー本体

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `MS365_MCP_CLIENT_ID` | No | 組み込みアプリ | Azure AD アプリのクライアント ID |
| `MS365_MCP_TENANT_ID` | No | `common` | テナント ID |
| `MS365_MCP_ORG_MODE` | No | `false` | 組織モード（Teams, SharePoint 等を有効化） |
| `READ_ONLY` | No | `false` | 読み取り専用モード |
| `LOG_LEVEL` | No | `info` | ログレベル |

## 外部通信先

ファイアウォール / プロキシのホワイトリスト設定用:

### ランタイム（稼働中に必要）

| FQDN | ポート | 用途 |
|------|--------|------|
| `login.microsoftonline.com` | 443/HTTPS | Entra ID OAuth 認可・トークン取得 |
| `graph.microsoft.com` | 443/HTTPS | Microsoft 365 API（メール・カレンダー等） |

### ビルド時のみ

| FQDN | ポート | 用途 |
|------|--------|------|
| `registry.npmjs.org` | 443/HTTPS | npm パッケージのダウンロード |
| `raw.githubusercontent.com` | 443/HTTPS | Graph API OpenAPI 仕様のダウンロード |

## 利用可能な MCP ツール

### 個人アカウントツール

| カテゴリ | ツール |
|----------|--------|
| **メール** | list-mail-messages, get-mail-message, send-mail, create-draft-email, move-mail-message, delete-mail-message, list-mail-folders, forward-mail-message, reply-mail-message 等 |
| **カレンダー** | list-calendars, list-calendar-events, get-calendar-event, get-calendar-view, create-calendar-event, update-calendar-event, delete-calendar-event, find-meeting-times |
| **OneDrive** | list-drives, list-folder-files, download-onedrive-file-content, upload-file-content, delete-onedrive-file |
| **Excel** | list-excel-worksheets, get-excel-range, create-excel-chart, format-excel-range, sort-excel-range |
| **OneNote** | list-onenote-notebooks, list-onenote-notebook-sections, list-onenote-section-pages, get-onenote-page-content, create-onenote-page |
| **ToDo** | list-todo-task-lists, list-todo-tasks, get-todo-task, create-todo-task, update-todo-task, delete-todo-task |
| **Planner** | list-planner-tasks, get-planner-plan, list-plan-tasks, get-planner-task, create-planner-task |
| **連絡先** | list-outlook-contacts, get-outlook-contact, create-outlook-contact, update-outlook-contact, delete-outlook-contact |
| **ユーザー** | get-current-user |
| **検索** | search-query |

### 組織アカウントツール（`--org-mode` 有効時）

| カテゴリ | ツール |
|----------|--------|
| **Teams** | list-joined-teams, get-team, list-team-channels, list-channel-messages, send-channel-message, list-chats, send-chat-message 等 |
| **SharePoint** | search-sharepoint-sites, get-sharepoint-site, list-sharepoint-site-drives, list-sharepoint-site-lists 等 |
| **会議** | list-online-meetings, list-meeting-transcripts, get-meeting-transcript-content, list-meeting-recordings 等 |
| **共有メールボックス** | list-shared-mailbox-messages, get-shared-mailbox-message, send-shared-mailbox-mail |
| **ユーザー管理** | list-users |

## トラブルシューティング

### Token exchange with Azure Entra failed

**原因**: `ENTRA_CLIENT_SECRET` が不正、またはパブリッククライアントフローが有効になっていない。

**対処**:
1. Azure Portal → アプリの登録 → 認証 → 「パブリック クライアント フローを許可する」が **はい** になっていることを確認
2. `ENTRA_CLIENT_SECRET` を設定していない場合、proxy.js が `client_secret` パラメータを送信していないか確認

### MCP サーバーに接続できない

**対処**:
1. コンテナが起動しているか確認: `docker ps`
2. ヘルスチェック: `curl http://localhost:8080/health`
3. ログ確認: `docker logs ms365-mcp`

### 権限エラー (403 Forbidden)

**対処**: Azure Portal → API のアクセス許可で必要なスコープが付与されているか確認。「管理者の同意を付与」が必要な場合があります。

## 開発

```bash
# 依存パッケージのインストール
pnpm install

# Graph API クライアントコードの生成
pnpm run generate

# ビルド
pnpm run build

# Docker イメージのビルド
docker build -t ms365-mcp .
```

## ライセンス

MIT © 2026 Softeria
