/**
 * 前端领域模型（camelCase，框架无关）。
 *
 * 与后端 wire（snake_case）的转换集中在 `mapper/TokenMapper.ts`。
 */

/** 用户 Token 使用快照（累计 + 当日 + 当月） */
export interface TokenUsageSnapshot {
  userId: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayTotalTokens: number;
  todayRequestCount: number;
  monthTotalTokens: number;
  updatedAt: string | null;
}

/** 当前用户生效配额 */
export interface TokenQuota {
  perRequestLimit: number;
  dailyLimit: number;
  monthlyLimit: number | null;
}

/** check 结果；reason：per_request_exceeded / daily_limit_exceeded / meta_unavailable */
export interface TokenCheckResult {
  allowed: boolean;
  reason: string | null;
  usage: TokenUsageSnapshot;
  quota: TokenQuota;
}

/** consume 结果 */
export interface TokenConsumeResult {
  usage: TokenUsageSnapshot;
  quota: TokenQuota;
  /** 本次已使当日用量超过上限（下一次 check 将拦截） */
  overLimit: boolean;
}

/** 剩余额度（供 UI 展示：今日已用 / 今日剩余） */
export interface TokenRemaining {
  perRequestLimit: number;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
}
