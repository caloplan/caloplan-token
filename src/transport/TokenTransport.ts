import { TokenError } from "../errors/TokenError.js";
import type {
  BackendCheckRequest,
  BackendCheckResponse,
  BackendConsumeRequest,
  BackendConsumeResponse,
  BackendErrorBody,
  BackendRemainingResponse,
  BackendTokenQuota,
  BackendTokenUsage,
} from "./types.js";

/**
 * 轻量 HTTP 封装（fetch）：请求 fastapi-token-service，Bearer Token 注入 + 错误分类。
 *
 * - 不混入业务逻辑；使用全局 fetch（Node 18+ / 浏览器 / RN 均可用）；
 * - `internalKeyProvider` 仅 check / consume 写端点需要（服务端场景）；
 *   client 只读查询场景无需提供；
 * - 支持注入 `fetchImpl` 便于测试与特殊运行环境适配；
 * - Token 仅透传，登录 / 刷新 / 生命周期由外部 `tokenProvider` 负责。
 */

export interface TokenTransportOptions {
  /** fastapi-token-service 根地址，如 `http://localhost:9096`（末尾斜杠自动去除） */
  baseURL: string;
  /** 外部注入的 Token 提供器：返回 JWT 字符串；null / 空串表示无登录态 */
  tokenProvider: () => string | null | Promise<string | null>;
  /**
   * 内部密钥提供器（仅 check / consume 写端点需要，服务端场景）。
   * 返回 X-Token-Internal-Key；client 只读场景无需提供。
   */
  internalKeyProvider?: () => string | null | Promise<string | null>;
  /** 可注入的 fetch 实现（默认全局 fetch） */
  fetchImpl?: typeof fetch;
}

export class TokenTransport {
  private readonly baseURL: string;
  private readonly tokenProvider: () => string | null | Promise<string | null>;
  private readonly internalKeyProvider?: () => string | null | Promise<string | null>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TokenTransportOptions) {
    this.baseURL = options.baseURL.replace(/\/+$/, "");
    this.tokenProvider = options.tokenProvider;
    this.internalKeyProvider = options.internalKeyProvider;
    this.fetchImpl =
      options.fetchImpl ??
      ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
    if (typeof this.fetchImpl !== "function") {
      throw new Error("TokenTransport 初始化失败：当前环境没有可用的 fetch（请注入 fetchImpl）");
    }
  }

  /** POST /api/v1/token/check（内部写端点：需内部密钥） */
  async check(body: BackendCheckRequest): Promise<BackendCheckResponse> {
    return this.request<BackendCheckResponse>("/api/v1/token/check", body, { withInternalKey: true });
  }

  /** POST /api/v1/token/consume（内部写端点：需内部密钥） */
  async consume(body: BackendConsumeRequest): Promise<BackendConsumeResponse> {
    return this.request<BackendConsumeResponse>("/api/v1/token/consume", body, { withInternalKey: true });
  }

  /** GET /api/v1/token/usage → `{usage}` */
  async getUsage(): Promise<{ usage: BackendTokenUsage }> {
    return this.request<{ usage: BackendTokenUsage }>("/api/v1/token/usage", undefined, { method: "GET" });
  }

  /** GET /api/v1/token/quota → `{quota}` */
  async getQuota(): Promise<{ quota: BackendTokenQuota }> {
    return this.request<{ quota: BackendTokenQuota }>("/api/v1/token/quota", undefined, { method: "GET" });
  }

  /** GET /api/v1/token/remaining */
  async getRemaining(): Promise<BackendRemainingResponse> {
    return this.request<BackendRemainingResponse>("/api/v1/token/remaining", undefined, { method: "GET" });
  }

  private async request<T>(
    path: string,
    body: unknown,
    opts: { method?: "GET" | "POST"; withInternalKey?: boolean } = {},
  ): Promise<T> {
    const token = await this.tokenProvider();
    if (token == null || token === "") {
      throw new TokenError("auth", "缺少访问令牌：tokenProvider 返回空", { code: "missing_token" });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (opts.withInternalKey) {
      const key = this.internalKeyProvider ? await this.internalKeyProvider() : null;
      if (key != null && key !== "") {
        headers["X-Token-Internal-Key"] = key;
      }
    }
    const method = opts.method ?? (body === undefined ? "GET" : "POST");
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseURL}${path}`, {
        method,
        headers,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });
    } catch (err) {
      throw new TokenError("network", `网络请求失败：${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }

    if (!response.ok) {
      throw await this.classifyError(response);
    }

    try {
      return (await response.json()) as T;
    } catch (err) {
      throw new TokenError("backend", "响应不是合法 JSON", { status: response.status, cause: err });
    }
  }

  /** 按状态码归类错误；尽力解析 FastAPI 的 `{detail}` */
  private async classifyError(response: Response): Promise<TokenError> {
    const status = response.status;
    let detail: string | undefined;
    let code: string | undefined;
    try {
      const raw = (await response.json()) as BackendErrorBody;
      if (typeof raw.detail === "string") {
        detail = raw.detail;
      } else if (raw.detail != null && typeof raw.detail === "object") {
        const obj = raw.detail as { message?: unknown };
        detail = typeof obj.message === "string" ? obj.message : JSON.stringify(raw.detail);
      } else if (typeof raw.message === "string") {
        detail = raw.message;
      }
      if (typeof raw.code === "string") code = raw.code;
    } catch {
      // 错误体不是合法 JSON：忽略，用状态码兜底
    }
    const message = detail ?? `HTTP ${status}`;

    if (status === 401 || status === 403) {
      return new TokenError("auth", `认证/权限失败（${status}）：${message}`, { status, code });
    }
    return new TokenError("backend", `后端错误（${status}）：${message}`, { status, code });
  }
}
