import type {
  TokenCheckResult,
  TokenConsumeResult,
  TokenQuota,
  TokenRemaining,
  TokenUsageSnapshot,
} from "./models/index.js";
import {
  mapCheckResponse,
  mapConsumeResponse,
  mapQuota,
  mapRemaining,
  mapUsage,
} from "./mapper/TokenMapper.js";
import { TokenTransport } from "./transport/TokenTransport.js";
import type { TokenTransportOptions } from "./transport/TokenTransport.js";

/**
 * caloplan-token 主入口：封装对 fastapi-token-service 的调用。
 *
 * 两个使用场景：
 * - Client（RN/Web）只读：baseURL 指向 chat 门户（仅 getUsage/getQuota/getRemaining）；
 * - 服务端场景：baseURL 指向 token service，check/consume 需提供 internalKeyProvider。
 */
export interface TokenClientOptions extends TokenTransportOptions {}

export interface ConsumeInput {
  inputTokens: number;
  outputTokens: number;
  model?: string | null;
  provider?: string | null;
}

export class TokenClient {
  private readonly transport: TokenTransport;

  constructor(options: TokenClientOptions) {
    this.transport = new TokenTransport(options);
  }

  /** LLM 调用前检查（内部写端点：需 internalKeyProvider） */
  async check(estimatedTokens?: number): Promise<TokenCheckResult> {
    const body = estimatedTokens === undefined ? {} : { estimated_tokens: estimatedTokens };
    return mapCheckResponse(await this.transport.check(body));
  }

  /** LLM 完成后记账（内部写端点：需 internalKeyProvider；usage 以真实值为准） */
  async consume(input: ConsumeInput): Promise<TokenConsumeResult> {
    return mapConsumeResponse(
      await this.transport.consume({
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        model: input.model ?? null,
        provider: input.provider ?? null,
      }),
    );
  }

  /** 查询当前用户使用快照（累计 + 当日 + 当月） */
  async getUsage(): Promise<TokenUsageSnapshot> {
    const r = await this.transport.getUsage();
    return mapUsage(r.usage);
  }

  /** 查询当前用户生效配额 */
  async getQuota(): Promise<TokenQuota> {
    const r = await this.transport.getQuota();
    return mapQuota(r.quota);
  }

  /** 查询当前用户剩余额度（今日已用 / 今日剩余） */
  async getRemaining(): Promise<TokenRemaining> {
    return mapRemaining(await this.transport.getRemaining());
  }
}
