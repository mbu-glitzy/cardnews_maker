import Anthropic from "@anthropic-ai/sdk";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import type { TextModelId } from "@/lib/pricing";
import type { AiOperation, Json } from "@/types/supabase";

/**
 * 모델 ID 매핑 (코드 내부 식별자 → Anthropic API 모델명)
 */
const MODEL_MAP: Record<TextModelId, string> = {
  "claude-opus-4-7": "claude-opus-4-7",
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
};

export interface ClaudeCallParams {
  userId: string;
  projectId?: string;
  model: TextModelId;
  operation: AiOperation;
  system?: string;
  messages: Anthropic.Messages.MessageParam[];
  maxTokens?: number;
  tools?: Anthropic.Messages.Tool[];
  metadata?: Json;
}

export async function callClaude(params: ClaudeCallParams) {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL_MAP[params.model],
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
  });

  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model: params.model,
    operation: params.operation,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    metadata: params.metadata,
  });

  return response;
}

/**
 * 스트리밍 호출 (리서치/기획/카피 UX 개선용).
 * 종료 시 usage 자동 로깅.
 */
export async function streamClaude(params: ClaudeCallParams) {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: MODEL_MAP[params.model],
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
  });

  // 호출자가 stream을 소비한 뒤 finalMessage()로 usage를 가져갈 수 있도록 래핑
  const logUsageOnFinish = async () => {
    try {
      const final = await stream.finalMessage();
      await logTextUsage({
        userId: params.userId,
        projectId: params.projectId,
        model: params.model,
        operation: params.operation,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cachedInputTokens: final.usage.cache_read_input_tokens ?? 0,
        metadata: params.metadata,
      });
    } catch (e) {
      console.error("[anthropic] 스트림 usage 로깅 실패", e);
    }
  };

  return { stream, logUsageOnFinish };
}
