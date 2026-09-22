import { TokenClient } from "./TokenClient.js";
import type { TokenClientOptions } from "./TokenClient.js";

let instance: TokenClient | null = null;

/**
 * 初始化 caloplan-token 单例（与 createCPChat / createCPCore / createCPUser 风格一致）。
 * - baseURL：fastapi-token-service 地址（或 chat 门户地址，client 只读场景）
 * - tokenProvider：外部注入的 Token 提供器（登录 / 刷新由上层负责）
 * - internalKeyProvider：仅 check/consume 写端点需要（服务端场景）
 */
export function createCPToken(options: TokenClientOptions): TokenClient {
  instance = new TokenClient(options);
  return instance;
}

/** 获取 caloplan-token 单例：token.check / consume / getUsage / getQuota / getRemaining */
export function getCPToken(): TokenClient {
  if (instance == null) {
    throw new Error("CPToken 未初始化：请先调用 createCPToken()");
  }
  return instance;
}
