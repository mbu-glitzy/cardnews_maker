"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteProject } from "./actions";

export function DeleteProjectButton({
  projectId,
  topic,
}: {
  projectId: string;
  topic: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmText = `"${topic.slice(0, 30)}${topic.length > 30 ? "..." : ""}" 프로젝트를 삭제할까요?\n관련된 모든 카드·이미지가 함께 삭제됩니다.`;
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      await deleteProject(projectId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="btn-ghost text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
      title="프로젝트 삭제"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
