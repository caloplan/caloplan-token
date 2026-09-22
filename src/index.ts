// ── 模型（前端领域层，camelCase）──
export type {
  TokenUsageSnapshot,
  TokenQuota,
  TokenCheckResult,
  TokenConsumeResult,
  TokenRemaining,
} from "./models/index.js";

// ── TokenClient 主入口 ──
export { TokenClient } from "./TokenClient.js";
export type { TokenClientOptions, ConsumeInput } from "./TokenClient.js";

// ── 单例：createCPToken() 初始化 / getCPToken() 获取 ──
export { createCPToken, getCPToken } from "./cptoken.js";

// ── 传输层（HTTP 封装 + wire 契约）──
export { TokenTransport } from "./transport/TokenTransport.js";
export type { TokenTransportOptions } from "./transport/TokenTransport.js";
export type {
  BackendCheckRequest,
  BackendCheckResponse,
  BackendConsumeRequest,
  BackendConsumeResponse,
  BackendRemainingResponse,
  BackendTokenQuota,
  BackendTokenUsage,
  BackendErrorBody,
} from "./transport/types.js";

// ── 映射层 ──
export {
  mapUsage,
  mapQuota,
  mapCheckResponse,
  mapConsumeResponse,
  mapRemaining,
} from "./mapper/TokenMapper.js";

// ── 错误 ──
export { TokenError, isTokenError } from "./errors/TokenError.js";
export type { TokenErrorKind, TokenErrorOptions } from "./errors/TokenError.js";
