/**
 * 카드 role 의 표시 라벨을 톤 기반으로 매핑.
 *
 * 같은 role 도 톤에 따라 의미가 미묘하게 달라지므로 (예: informative 의 `closing`은
 * "인사이트 정리"지만 emotional 의 `closing`은 "여운"), 사용자에게 보여주는 라벨도
 * 톤별로 다르게 표시한다. 색상은 role 별로 일관되게 유지.
 */

export type CardRole =
  | "hook"
  | "cover"
  | "problem"
  | "solution"
  | "proof"
  | "detail"
  | "closing";

export type ToneId =
  | "informative"
  | "issue"
  | "emotional"
  | "humorous"
  | "sophisticated";

const ROLE_COLORS: Record<CardRole, string> = {
  hook: "bg-amber-500/15 text-amber-400",
  cover: "bg-amber-500/15 text-amber-400",
  problem: "bg-red-500/15 text-red-400",
  solution: "bg-emerald-500/15 text-emerald-400",
  proof: "bg-sky-500/15 text-sky-400",
  detail: "bg-violet-500/15 text-violet-400",
  closing: "bg-accent/15 text-accent",
};

// 기본 라벨 (톤이 매칭 안 될 때 fallback)
const DEFAULT_LABELS: Record<CardRole, string> = {
  hook: "후킹",
  cover: "커버",
  problem: "문제",
  solution: "해법",
  proof: "근거",
  detail: "디테일",
  closing: "끝맺음",
};

// 톤 × role → 라벨
const TONE_ROLE_LABELS: Record<ToneId, Partial<Record<CardRole, string>>> = {
  informative: {
    hook: "후킹",
    cover: "커버",
    problem: "문제",
    solution: "해법",
    proof: "근거",
    detail: "디테일",
    closing: "인사이트 정리",
  },
  issue: {
    hook: "이슈 포착",
    cover: "표지",
    problem: "현황",
    proof: "데이터·사례",
    detail: "배경·영향",
    closing: "시사점",
  },
  emotional: {
    hook: "공감 질문",
    cover: "표지",
    problem: "고민·감정",
    proof: "공감 사례",
    detail: "스토리·전환",
    closing: "여운",
  },
  humorous: {
    hook: "반전 시작",
    cover: "표지",
    problem: "상황극",
    proof: "현실",
    detail: "모순",
    closing: "통찰 한 줄",
  },
  sophisticated: {
    hook: "시선 끌기",
    cover: "커버",
    proof: "권위·인용",
    detail: "관점·분석",
    closing: "브랜드 마무리",
  },
};

function isCardRole(v: string): v is CardRole {
  return v in DEFAULT_LABELS;
}

function isToneId(v: string | null | undefined): v is ToneId {
  return !!v && v in TONE_ROLE_LABELS;
}

/**
 * 카드 role + 톤 → UI 표시용 메타 (라벨 + 색상 클래스)
 */
export function getRoleMeta(
  role: string,
  tone: string | null | undefined
): { label: string; color: string } {
  if (!isCardRole(role)) {
    return { label: role, color: "bg-bg-elevated text-text-secondary" };
  }
  const color = ROLE_COLORS[role];
  const toneLabels = isToneId(tone) ? TONE_ROLE_LABELS[tone] : undefined;
  const label = toneLabels?.[role] ?? DEFAULT_LABELS[role];
  return { label, color };
}
