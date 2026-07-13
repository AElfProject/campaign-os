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

## Migrations

先执行只读 plan/validate。`apply` 必须通过独立 approval flag 显式授权；API server 启动不会自动执行 migration。

Run read-only plan/validate first. `apply` requires a separate explicit approval flag; API server startup never runs migrations automatically.

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
CAMPAIGN_OS_TEST_DATABASE_URL="$LOCAL_CAMPAIGN_OS_DATABASE_URL" npm run test:postgres
npm run server:smoke
npm run build
```

Integration 验收覆盖真实 migration、API create/task/verify/eligibility/export、server restart、20 个并发 Campaign create、20 个并发 Participant/Completion workflow、跨 Campaign 隔离、唯一 ID、Pool shutdown 和 p95 <= 500 ms。

Integration acceptance covers real migrations, API create/task/verify/eligibility/export, server restart, 20 concurrent Campaign creates, 20 concurrent Participant/Completion workflows, cross-Campaign isolation, unique IDs, Pool shutdown, and p95 <= 500 ms.

## Shutdown

正常 shutdown 会先停止接收新 HTTP 请求，排空 active requests，再关闭 Campaign store/Pool 和 wallet repository。重复调用 stop/close 是幂等的；失败日志只包含安全 error code 与 Trace ID。

Graceful shutdown first stops new HTTP intake, drains active requests, then closes the Campaign store/Pool and wallet repository. Repeated stop/close calls are idempotent; failure logs contain only a safe error code and Trace ID.
