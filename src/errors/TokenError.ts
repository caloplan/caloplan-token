/**
 * caloplan-token 统一错误类型。
 *
 * 分类（`kind`）：
 * - `network`：fetch 失败 / 网络不可达
 * - `auth`：缺少 Token、401 认证失败、403 权限不足（含写端点内部密钥缺失/错误）
 * - `backend`：后端返回的其他 HTTP 错误 / 响应不是合法 JSON
 *
 * SDK 不负责 Token 刷新 / 重新登录：401 时抛出 `TokenError(kind=auth)`，
 * 由上层决定如何处理。
 */

export type TokenErrorKind = "network" | "auth" | "backend";

export interface TokenErrorOptions {
  /** HTTP 状态码（如有） */
  status?: number;
  /** 后端结构化错误码（若返回） */
  code?: string;
  /** 是否可重试 */
  retryable?: boolean;
  cause?: unknown;
}

export class TokenError extends Error {
  readonly kind: TokenErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly retryable: boolean;

  constructor(kind: TokenErrorKind, message: string, options: TokenErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "TokenError";
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

export function isTokenError(err: unknown): err is TokenError {
  return err instanceof TokenError;
}
