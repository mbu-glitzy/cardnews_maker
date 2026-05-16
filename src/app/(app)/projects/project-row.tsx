"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { Row, ProjectStatus } from "@/types/supabase";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/project-flow";

type ProjectListItem = Pick<
  Row<"projects">,
  | "id"
  | "topic"
  | "tone"
  | "card_count"
  | "status"
  | "created_at"
  | "published_permalink"
  | "published_at"
>;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${mm}`;
}

export function ProjectRow({ project }: { project: ProjectListItem }) {
  const status: ProjectStatus = project.status;
  const isCompleted = status === "completed";
  const statusColor = STATUS_COLORS[status];
  const statusLabel = STATUS_LABELS[status];

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-elevated"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs ${statusColor}`}>
              {statusLabel}
            </span>
            {project.published_permalink && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-400">
                ✓ 발행됨
              </span>
            )}
            <span className="text-xs text-text-muted">
              {project.card_count}장 · {project.tone}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-text-primary">
            {project.topic}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {formatDateTime(project.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isCompleted && (
            <span
              className="hidden text-xs text-accent sm:inline"
              title="이어서 작업"
            >
              이어가기
            </span>
          )}
          {project.published_permalink && (
            <a
              href={project.published_permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-ghost text-xs"
              title="인스타에서 보기"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <ArrowRight className="h-4 w-4 text-text-muted" />
        </div>
      </Link>
    </li>
  );
}
