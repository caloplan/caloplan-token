/**
 * fastapi-token-service wire 契约（snake_case，严格对齐后端 Pydantic schema：
 * `app/schemas/token.py`）。
 *
 * 仅类型定义，不含任何实现；映射逻辑见 `mapper/TokenMapper.ts`。
 */

/** GET /api/v1/token/usage → `{usage: BackendTokenUsage}` */
export interface BackendTokenUsage {
  user_id: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  today_input_tokens: number;
  today_output_tokens: number;
  today_total_tokens: number;
  today_request_count: number;
  month_total_tokens: number;
  updated_at: string | null;
}

/** GET /api/v1/token/quota → `{quota: BackendTokenQuota}` */
export interface BackendTokenQuota {
  per_request_limit: number;
  daily_limit: number;
  monthly_limit?: number | null;
}

/** POST /api/v1/token/check 请求体 */
export interface BackendCheckRequest {
  estimated_tokens?: number;
}

/** POST /api/v1/token/check 响应 */
export interface BackendCheckResponse {
  allowed: boolean;
  reason?: string | null;
  usage: BackendTokenUsage;
  quota: BackendTokenQuota;
}

/** POST /api/v1/token/consume 请求体 */
export interface BackendConsumeRequest {
  input_tokens: number;
  output_tokens: number;
  model?: string | null;
  provider?: string | null;
}

/** POST /api/v1/token/consume 响应 */
export interface BackendConsumeResponse {
  usage: BackendTokenUsage;
  quota: BackendTokenQuota;
  over_limit: boolean;
}

/** GET /api/v1/token/remaining 响应 */
export interface BackendRemainingResponse {
  per_request_limit: number;
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
}

/** FastAPI 错误响应体（尽力解析，非必需结构） */
export interface BackendErrorBody {
  detail?: unknown;
  code?: string;
  message?: string;
  retryable?: boolean;
}
