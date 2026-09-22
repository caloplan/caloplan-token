import type {
  TokenCheckResult,
  TokenConsumeResult,
  TokenQuota,
  TokenRemaining,
  TokenUsageSnapshot,
} from "../models/index.js";
import type {
  BackendCheckResponse,
  BackendConsumeResponse,
  BackendRemainingResponse,
  BackendTokenQuota,
  BackendTokenUsage,
} from "../transport/types.js";

/**
 * wire（snake_case）→ 前端领域（camelCase）映射，集中在此处。
 */

export function mapUsage(b: BackendTokenUsage): TokenUsageSnapshot {
  return {
    userId: b.user_id,
    inputTokens: b.input_tokens,
    outputTokens: b.output_tokens,
    totalTokens: b.total_tokens,
    requestCount: b.request_count,
    todayInputTokens: b.today_input_tokens,
    todayOutputTokens: b.today_output_tokens,
    todayTotalTokens: b.today_total_tokens,
    todayRequestCount: b.today_request_count,
    monthTotalTokens: b.month_total_tokens,
    updatedAt: b.updated_at ?? null,
  };
}

export function mapQuota(b: BackendTokenQuota): TokenQuota {
  return {
    perRequestLimit: b.per_request_limit,
    dailyLimit: b.daily_limit,
    monthlyLimit: b.monthly_limit ?? null,
  };
}

export function mapCheckResponse(b: BackendCheckResponse): TokenCheckResult {
  return {
    allowed: b.allowed,
    reason: b.reason ?? null,
    usage: mapUsage(b.usage),
    quota: mapQuota(b.quota),
  };
}

export function mapConsumeResponse(b: BackendConsumeResponse): TokenConsumeResult {
  return {
    usage: mapUsage(b.usage),
    quota: mapQuota(b.quota),
    overLimit: b.over_limit,
  };
}

export function mapRemaining(b: BackendRemainingResponse): TokenRemaining {
  return {
    perRequestLimit: b.per_request_limit,
    dailyLimit: b.daily_limit,
    dailyUsed: b.daily_used,
    dailyRemaining: b.daily_remaining,
  };
}
