import type { ProjectStatus } from "@/types/supabase";

/**
 * 프로젝트 상태에 따른 다음 작업 단계 URL.
 * 중단된 프로젝트 재개에 사용.
 */
export function getResumeUrl(projectId: string, status: ProjectStatus): string {
  switch (status) {
    case "draft":
    case "researching":
      return `/new/research/${projectId}`;
    case "planning":
      return `/new/plan/${projectId}`;
    case "copywriting":
      return `/new/copy/${projectId}`;
    case "imaging":
    case "completed":
      return `/new/design/${projectId}`;
    default:
      return `/projects/${projectId}`;
  }
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "초안",
  researching: "리서치 중",
  planning: "기획 중",
  copywriting: "카피 작성 중",
  imaging: "디자인 중",
  completed: "완료",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "bg-bg-elevated text-text-secondary",
  researching: "bg-sky-500/15 text-sky-400",
  planning: "bg-violet-500/15 text-violet-400",
  copywriting: "bg-amber-500/15 text-amber-400",
  imaging: "bg-pink-500/15 text-pink-400",
  completed: "bg-emerald-500/15 text-emerald-400",
};
