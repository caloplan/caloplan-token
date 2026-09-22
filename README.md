# caloplan-token

CaloPlan Token SDK —— 对接 **fastapi-token-service**（LLM Token 用量 / 配额管理），纯 TypeScript、框架无关（React Native / Web / Node 通用）。
提供 LLM 调用前的 `check` 检查、调用后的 `consume` 记账，以及 `usage` / `quota` / `remaining` 查询，帮助前端与服务端统一管控 LLM 调用成本与防滥用。

## 相关项目（CaloPlan 全家桶）

CaloPlan 全栈项目统一托管在 GitHub Organization [caloplan](https://github.com/caloplan)：

| 类型 | 项目 | 与本项目关系 |
| --- | --- | --- |
| 前端 | [coloplan-v2](https://github.com/caloplan/coloplan-v2) | 上层客户端：通过本 SDK 只读展示 Token 用量 / 配额 |
| SDK（本仓库） | [caloplan-token](https://github.com/caloplan/caloplan-token) | LLM Token 用量 / 配额 SDK |
| SDK | [caloplan-core](https://github.com/caloplan/caloplan-core) | 餐食 / 食物领域模块（兄弟 SDK，不感知 Token） |
| SDK | [caloplan-user](https://github.com/caloplan/caloplan-user) | 用户 / 身体 / 营养目标模块（兄弟 SDK） |
| SDK | [caloplan-chat](https://github.com/caloplan/caloplan-chat) | AI 对话模块（兄弟 SDK，Token 闸门的主要消费者） |
| SDK | [caloplan-cache](https://github.com/caloplan/caloplan-cache) | 本地缓存（兄弟 SDK） |
| 微服务 | [fastapi-token-service](https://github.com/caloplan/fastapi-token-service) | 本 SDK 对接的 Token 用量 / 配额微服务 |
| 微服务 | [fastapi-chat-service](https://github.com/caloplan/fastapi-chat-service) | AI 对话服务（经 token_guard 调本服务过闸 / 门户转发只读查询） |
| 微服务 | [mservice-fastapi-user](https://github.com/caloplan/mservice-fastapi-user) | 认证 / 用户 / 身体数据微服务（JWT 签发方） |
| 微服务 | [mservice-fastapi-metastorage](https://github.com/caloplan/mservice-fastapi-metastorage) | 元数据存储（Token 用量 / 配额落库于此） |
| 微服务 | [fastapi-file-service](https://github.com/caloplan/fastapi-file-service) | 图片上传微服务 |

## 安装

```bash
pnpm add caloplan-token   # 或使用 file: 本地依赖
```

## 快速开始

```ts
import { createCPToken, getCPToken } from "caloplan-token";

// 初始化单例（与 createCPUser / createCPCore / createCPChat 风格一致）
createCPToken({
  baseURL: "http://localhost:9096",        // fastapi-token-service（或 chat 门户只读地址）
  tokenProvider: () => getLoginToken(),     // 外部注入的登录 JWT
  internalKeyProvider: () => "internal-key", // 仅服务端 check/consume 需要；缺省则写端点不可用
});

const token = getCPToken();

// LLM 调用前检查是否放行
const check = await token.check(5000);      // estimated_tokens
console.log(check.allowed, check.reason);   // allowed / per_request_exceeded / daily_limit_exceeded / meta_unavailable

// LLM 完成后按真实 usage 记账
await token.consume({
  inputTokens: 1200,
  outputTokens: 800,
  model: "deepseek-flash",
  provider: "deepseek",
});

// 只读查询
const usage = await token.getUsage();       // 累计 + 当日 + 当月
const quota = await token.getQuota();       // 当前用户生效配额
const remaining = await token.getRemaining(); // 今日已用 / 今日剩余
```

## API

| 方法 | 说明 | 场景 |
| --- | --- | --- |
| `check(estimatedTokens?)` | LLM 调用前检查是否放行（返回 `{ allowed, reason, usage, quota }`） | 服务端写端点，需 `internalKeyProvider` |
| `consume({ inputTokens, outputTokens, model?, provider? })` | LLM 完成后按真实 usage 记账 | 服务端写端点，需 `internalKeyProvider` |
| `getUsage()` | 使用快照（累计 + 当日 + 当月） | 客户端只读 |
| `getQuota()` | 当前用户生效配额 | 客户端只读 |
| `getRemaining()` | 今日已用 / 今日剩余 | 客户端只读 |

## 测试与构建

```bash
pnpm install
pnpm test        # tsx --test "src/**/*.test.ts"
pnpm build       # tsc -p tsconfig.build.json → dist/
pnpm typecheck   # tsc --noEmit
```
