import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  calculateImageCost,
  calculateTextCost,
  type ImageModelId,
  type ImageQuality,
  type TextModelId,
} from "@/lib/pricing";
import type { AiOperation, Json } from "@/types/supabase";

/**
 * 사용량 로깅 헬퍼.
 * AI 호출 직후 즉시 호출. 실패해도 본 흐름은 방해하지 않음 (로그만 콘솔).
 */

interface BaseLogParams {
  userId: string;
  projectId?: string;
  operation: AiOperation;
  metadata?: Json;
}

export interface TextUsageLog extends BaseLogParams {
  model: TextModelId;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface ImageUsageLog extends BaseLogParams {
  model: ImageModelId;
  imageCount: number;
  quality?: ImageQuality;
}

export async function logTextUsage(params: TextUsageLog): Promise<void> {
  const cost = calculateTextCost(
    params.model,
    params.inputTokens,
    params.outputTokens,
    params.cachedInputTokens ?? 0
  );

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("usage_logs").insert({
    user_id: params.userId,
    project_id: params.projectId ?? null,
    model: params.model,
    operation: params.operation,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cached_input_tokens: params.cachedInputTokens ?? null,
    image_count: null,
    image_quality: null,
    cost_usd: cost,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.error("[usage] 텍스트 사용량 로깅 실패", error);
  }
}

export async function logImageUsage(params: ImageUsageLog): Promise<void> {
  const cost = calculateImageCost(
    params.model,
    params.quality ?? "default",
    params.imageCount
  );

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("usage_logs").insert({
    user_id: params.userId,
    project_id: params.projectId ?? null,
    model: params.model,
    operation: params.operation,
    input_tokens: null,
    output_tokens: null,
    cached_input_tokens: null,
    image_count: params.imageCount,
    image_quality: params.quality ?? null,
    cost_usd: cost,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.error("[usage] 이미지 사용량 로깅 실패", error);
  }
}

export interface UsageRow {
  id: string;
  model: string;
  operation: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_input_tokens: number | null;
  image_count: number | null;
  image_quality: string | null;
  cost_usd: number;
  project_id: string | null;
  created_at: string;
}

export interface ModelSummary {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  imageCount: number;
  costUSD: number;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  costUSD: number;
}

export interface ProjectCost {
  projectId: string;
  topic: string;
  costUSD: number;
  calls: number;
}

/**
 * 사용자의 기간 내 모든 사용량 로그.
 */
export async function getUsageRows(
  userId: string,
  fromIso: string,
  toIso?: string
): Promise<UsageRow[]> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("usage_logs")
    .select(
      "id, model, operation, input_tokens, output_tokens, cached_input_tokens, image_count, image_quality, cost_usd, project_id, created_at"
    )
    .eq("user_id", userId)
    .gte("created_at", fromIso)
    .order("created_at", { ascending: false });
  if (toIso) q = q.lte("created_at", toIso);

  const { data, error } = await q.returns<UsageRow[]>();
  if (error) {
    console.error("[usage] 조회 실패", error);
    return [];
  }
  return data ?? [];
}

export function aggregateByModel(rows: UsageRow[]): ModelSummary[] {
  const map = new Map<string, ModelSummary>();
  for (const r of rows) {
    const existing = map.get(r.model) ?? {
      model: r.model,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      imageCount: 0,
      costUSD: 0,
    };
    existing.calls += 1;
    existing.inputTokens += r.input_tokens ?? 0;
    existing.outputTokens += r.output_tokens ?? 0;
    existing.cachedInputTokens += r.cached_input_tokens ?? 0;
    existing.imageCount += r.image_count ?? 0;
    existing.costUSD += Number(r.cost_usd);
    map.set(r.model, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.costUSD - a.costUSD);
}

export interface OperationBreakdown {
  operation: string;
  models: Array<{ model: string; calls: number; costUSD: number }>;
  totalCalls: number;
  totalCostUSD: number;
}

export function aggregateByOperation(rows: UsageRow[]): OperationBreakdown[] {
  const map = new Map<string, Map<string, { calls: number; cost: number }>>();
  for (const r of rows) {
    const op = r.operation;
    if (!map.has(op)) map.set(op, new Map());
    const inner = map.get(op)!;
    const e = inner.get(r.model) ?? { calls: 0, cost: 0 };
    e.calls += 1;
    e.cost += Number(r.cost_usd);
    inner.set(r.model, e);
  }
  return Array.from(map.entries())
    .map(([operation, inner]) => {
      const models = Array.from(inner.entries())
        .map(([model, agg]) => ({
          model,
          calls: agg.calls,
          costUSD: agg.cost,
        }))
        .sort((a, b) => b.costUSD - a.costUSD);
      const totalCalls = models.reduce((s, m) => s + m.calls, 0);
      const totalCostUSD = models.reduce((s, m) => s + m.costUSD, 0);
      return { operation, models, totalCalls, totalCostUSD };
    })
    .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
}

export function aggregateDaily(rows: UsageRow[]): DailyPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const date = new Date(r.created_at).toISOString().slice(0, 10);
    map.set(date, (map.get(date) ?? 0) + Number(r.cost_usd));
  }
  return Array.from(map.entries())
    .map(([date, costUSD]) => ({ date, costUSD }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 프로젝트별 비용 집계 + 토픽 조회.
 */
export async function aggregateByProject(
  userId: string,
  rows: UsageRow[]
): Promise<ProjectCost[]> {
  const map = new Map<string, { cost: number; calls: number }>();
  for (const r of rows) {
    if (!r.project_id) continue;
    const e = map.get(r.project_id) ?? { cost: 0, calls: 0 };
    e.cost += Number(r.cost_usd);
    e.calls += 1;
    map.set(r.project_id, e);
  }
  if (map.size === 0) return [];

  const admin = createSupabaseAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, topic")
    .eq("user_id", userId)
    .in("id", Array.from(map.keys()));

  const topicMap = new Map<string, string>();
  for (const p of projects ?? []) {
    topicMap.set(p.id, p.topic);
  }

  return Array.from(map.entries())
    .map(([projectId, agg]) => ({
      projectId,
      topic: topicMap.get(projectId) ?? "(삭제됨)",
      costUSD: agg.cost,
      calls: agg.calls,
    }))
    .sort((a, b) => b.costUSD - a.costUSD);
}

/**
 * 사용자의 월 예산 조회.
 */
export async function getMonthlyBudget(
  userId: string
): Promise<number | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("api_credentials")
    .select("monthly_budget_usd")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.monthly_budget_usd ?? null;
}

/**
 * 이번 달 누적 비용 조회.
 */
export async function getMonthlyCostUSD(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await admin
    .from("usage_logs")
    .select("cost_usd")
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  if (error) {
    console.error("[usage] 월별 비용 조회 실패", error);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
}
