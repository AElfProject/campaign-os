# Campaign OS

Campaign OS 是一个 Vite + React 产品界面，并包含可独立启动的 Node API runtime。默认模式用于本地产品评审；显式 PostgreSQL 模式为 Campaign、Task、Participant、Completion、Evidence 和 Referral 提供可重启的业务数据持久化。

Campaign OS is a Vite + React product interface with a standalone Node API runtime. The default mode is intended for local product review; explicit PostgreSQL mode provides restart-safe business persistence for Campaigns, Tasks, Participants, Completions, Evidence, and Referrals.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+（仅 PostgreSQL runtime、migration 和 integration test 需要）

- Node.js 20+
- PostgreSQL 14+ (required only for the PostgreSQL runtime, migrations, and integration test)

## Default Local Runtime

默认启动不会构造 PostgreSQL Pool，也不会尝试数据库连接。API 使用 deterministic Campaign DB adapter；通用 audit repository 默认使用 memory。

Default startup does not construct a PostgreSQL Pool or attempt a database connection. The API uses the deterministic Campaign DB adapter, while the generic audit repository defaults to memory.

```bash
npm install
npm run server:start
```

另一个终端启动前端，并通过 API bridge 连接本地 API：

Start the frontend in another terminal and connect it through the API bridge:

```bash
VITE_CAMPAIGN_OS_API_BASE_URL=http://127.0.0.1:5174 npm run dev
```

## Data Ownership

`CAMPAIGN_OS_PERSISTENCE_MODE` 只配置通用 audit summary repository（`memory` 或 `local_json`）。Campaign 业务实体由独立的 `CAMPAIGN_OS_CAMPAIGN_DB_MODE` 配置管理；两者不能互相替代。

`CAMPAIGN_OS_PERSISTENCE_MODE` configures only the generic audit-summary repository (`memory` or `local_json`). Campaign business entities are managed by the separate `CAMPAIGN_OS_CAMPAIGN_DB_MODE` configuration; neither setting aliases the other.

## PostgreSQL Runtime

PostgreSQL 必须显式启用。连接值只应通过环境变量或 secret manager 注入；不要提交真实 credential。

PostgreSQL must be enabled explicitly. Inject connection values only through environment variables or a secret manager; never commit real credentials.

```bash
export CAMPAIGN_OS_CAMPAIGN_DB_MODE=postgres
export CAMPAIGN_OS_DATABASE_URL="${LOCAL_CAMPAIGN_OS_DATABASE_URL:?set a local database URL}"
export CAMPAIGN_OS_DATABASE_SSL_MODE=disable
export CAMPAIGN_OS_DATABASE_POOL_MAX=10
export CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS=5000
export CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS=10000
npm run server:start
```

`disable` 只允许 loopback URL。非 loopback URL 默认使用 `verify-full`；也支持显式 `require`、`verify-ca` 或 `verify-full`。Pool max 范围为 1-20，connect timeout 为 100-30000 ms，idle timeout 为 1000-60000 ms。缺少或非法配置会 fail closed，不会回退写入本地 Map/JSON。

`disable` is accepted only for loopback URLs. Non-loopback URLs default to `verify-full`; explicit `require`, `verify-ca`, and `verify-full` are also supported. Pool max is bounded to 1-20, connect timeout to 100-30000 ms, and idle timeout to 1000-60000 ms. Missing or invalid configuration fails closed without falling back to local Map/JSON writes.

## Durable Admin Review Runtime

Durable Admin review 默认关闭，关闭时 `/api/admin/*` 返回带 Trace ID 的 `404` safe envelope，且不会构造 Admin PostgreSQL Pool。启用后必须同时使用 PostgreSQL Campaign runtime、已按顺序应用到 `0003_admin_review_rank_projection` 的 migrations、issued wallet session 和 server-side membership；client role claim 本身不能授予权限。

Durable Admin review is disabled by default. While disabled, `/api/admin/*` returns a Trace-ID-bearing `404` safe envelope and no Admin PostgreSQL Pool is constructed. Enabling it also requires the PostgreSQL Campaign runtime, migrations applied in order through `0003_admin_review_rank_projection`, an issued wallet session, and server-side membership; a client role claim never grants authority by itself.

```bash
export CAMPAIGN_OS_ADMIN_REVIEW_ENABLED=true
export CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON='[{"active":true,"campaignIds":["<campaign-id>"],"roleIds":["review_operator"],"subjectAddress":"<admin-wallet-address>"}]'
```

Membership 默认空且 deny-all。每个 entry 必须显式配置 `active`、bounded Campaign scope、允许的 operator role 和大小写敏感的 issued subject address。配置非法、PostgreSQL 不可用或最新 `0003` migration 缺失时，Admin runtime fail closed，不会回退到 seeded/local Admin data。

Membership is empty and deny-all by default. Every entry must explicitly define `active`, a bounded Campaign scope, an allowed operator role, and the case-sensitive issued subject address. Invalid configuration, an unavailable PostgreSQL database, or a missing latest `0003` migration fails closed without falling back to seeded or local Admin data.

## Controlled Stage Product Review

阶段产品验收可以显式启用受控身份选择和全部 draft Participant preview，使一个新建 Campaign 无需预知 ID 即可连续完成
Owner、Participant A/B 与 Admin 流程。两项配置默认关闭，只能用于隔离的 local/stage 环境；生产环境不得使用 `*` scope。

Controlled stage product acceptance can explicitly enable the bounded identity selector and all-draft Participant preview so a newly created
Campaign can move through Owner, Participant A/B, and Admin flows without a pre-known ID. Both settings are disabled by default and are for an
isolated local/stage environment only; production must never use the `*` scope.

API runtime：

API runtime:

```bash
export CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS='*'
export CAMPAIGN_OS_API_CORS_ORIGINS=http://127.0.0.1:5173
```

`*` 必须单独配置，不能与显式 Campaign IDs 混用。它只影响 issued Participant 对 draft Campaign 的 preview access；anonymous、
deleted/invalid Campaign、Owner authorization 和 Admin server-side membership 仍保持原有边界。

`*` must be configured alone and cannot be mixed with explicit Campaign IDs. It only affects issued Participant preview access to draft
Campaigns; anonymous access, deleted or invalid Campaigns, Owner authorization, and server-side Admin membership keep their existing boundaries.

Frontend：

Frontend:

```bash
VITE_CAMPAIGN_OS_API_BASE_URL=http://127.0.0.1:5174 \
VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED=1 \
npm run dev
```

Stage mode只提供allowlisted safe fixtures，并隔离legacy seeded Project/Admin success surfaces。关闭frontend flag会恢复普通UI；清空
Participant preview env会立即恢复draft deny-all。回滚不得删除已持久化的Campaign、Completion、Decision或Artifact。

Stage mode exposes only allowlisted safe fixtures and isolates legacy seeded Project/Admin success surfaces. Disabling the frontend flag restores
the normal UI; clearing the Participant preview environment value restores draft deny-all immediately. Rollback must not delete persisted
Campaigns, Completions, Decisions, or Artifacts.

## Migrations

Migration runner 按顺序加载 `0001_campaign_runtime`、additive `0002_admin_review_export` 和 additive `0003_admin_review_rank_projection`。先执行只读 plan/validate；`apply` 必须通过独立 approval flag 显式授权。API server 启动不会自动执行 migration。

The migration runner loads `0001_campaign_runtime`, additive `0002_admin_review_export`, and additive `0003_admin_review_rank_projection` in order. Run read-only plan/validate first; `apply` requires a separate explicit approval flag. API server startup never runs migrations automatically.

```bash
npm run server:migrate -- --plan
npm run server:migrate -- --validate
CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS=true npm run server:migrate -- --apply
npm run server:migrate -- --validate
```

## Verification

普通测试会安全跳过真实 PostgreSQL suite。完整验收需要一个具备 `CREATEDB` 权限的测试连接；suite 会创建随机隔离 database，并在结束时只删除该 database。

Ordinary tests safely skip the real PostgreSQL suite. Full acceptance requires a test connection with `CREATEDB` permission; the suite creates a randomized isolated database and drops only that database afterward.

```bash
npm test
CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS=1 \
  CAMPAIGN_OS_TEST_DATABASE_URL="$LOCAL_CAMPAIGN_OS_DATABASE_URL" \
  npm run test:postgres
npm run server:smoke
npm run build
```

`CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS=1` 禁止把缺失 URL、skipped suite 或 zero executed tests 记为成功。`server:smoke` 验证默认关闭的 Admin route fail closed；enabled Admin PostgreSQL workflow 由 required integration suite 验证。

`CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS=1` prevents a missing URL, skipped suite, or zero executed tests from being reported as success. `server:smoke` verifies that the default-disabled Admin route fails closed; the required integration suite verifies the enabled Admin PostgreSQL workflow.

Integration 验收覆盖真实 `0001`/`0002`/`0003` migrations、Owner create、Participant A/B verify、Admin decision/winner、exact CSV/JSON artifact、并发幂等、跨 Campaign 隔离、完整 restart、旧 session 失效、fresh session 恢复、Pool shutdown 和性能边界。

Integration acceptance covers real `0001`/`0002`/`0003` migrations, Owner creation, Participant A/B verification, Admin decisions and winners, exact CSV/JSON artifacts, concurrent idempotency, cross-Campaign isolation, full restart, old-session invalidation, fresh-session recovery, Pool shutdown, and performance bounds.

## Rollback

执行 `apply` 前先建立可恢复 backup 并保留 migration plan。Migration 失败会由 transaction 回滚；若 migrations 已推进到 `0003` 后应用层出现问题，先将 `CAMPAIGN_OS_ADMIN_REVIEW_ENABLED=false` 并回滚 application release，保留 append-only decision/artifact 数据与 additive rank index。日常回滚不得运行 down migration、`TRUNCATE` 或删除历史记录。

Create a restorable backup and retain the migration plan before `apply`. A failed migration is rolled back by its transaction. If the application fails after migrations advance through `0003`, first set `CAMPAIGN_OS_ADMIN_REVIEW_ENABLED=false` and roll back the application release while preserving append-only decision and artifact data and the additive rank index. Routine rollback must not run a down migration, `TRUNCATE`, or delete historical records.

物理 schema rollback 只允许在独立维护窗口、验证 backup/restore 且显式批准后执行；Public runtime 不提供自动 down 命令。

Physical schema rollback is allowed only in a separate maintenance window after backup/restore verification and explicit approval; the public runtime provides no automatic down command.

## Shutdown

正常 shutdown 会先停止接收新 HTTP 请求，排空 active requests，再关闭 Campaign store/Pool 和 wallet repository。重复调用 stop/close 是幂等的；失败日志只包含安全 error code 与 Trace ID。

Graceful shutdown first stops new HTTP intake, drains active requests, then closes the Campaign store/Pool and wallet repository. Repeated stop/close calls are idempotent; failure logs contain only a safe error code and Trace ID.
