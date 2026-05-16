"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Instagram,
  Link as LinkIcon,
  Loader2,
  CircleAlert,
  Check,
  Unlink,
} from "lucide-react";
import { disconnectInstagram } from "./instagram-actions";

type IgAccount = {
  ig_username: string | null;
  fb_page_name: string | null;
  token_expires_at: string | null;
  connected_at: string;
};

export function InstagramSection({
  account,
  statusParam,
  messageParam,
}: {
  account: IgAccount | null;
  statusParam: string | null;
  messageParam: string | null;
}) {
  const router = useRouter();
  const [disconnecting, startDisconnect] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  function handleDisconnect() {
    if (!confirm("Instagram 연결을 해제할까요?")) return;
    startDisconnect(async () => {
      await disconnectInstagram();
      router.refresh();
    });
  }

  const expiresLabel = formatExpires(account?.token_expires_at ?? null);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Instagram className="h-4 w-4" />
          Instagram 연결
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          제작 완료된 카드뉴스를 인스타에 캐러셀로 자동 발행합니다.
        </p>
      </div>

      <div className="px-5 py-5">
        {!dismissed && statusParam === "connected" && (
          <Banner kind="ok" onClose={() => setDismissed(true)}>
            Instagram 계정이 연결되었습니다.
          </Banner>
        )}
        {!dismissed && statusParam === "error" && (
          <Banner kind="error" onClose={() => setDismissed(true)}>
            연결 실패: {messageParam ?? "(이유 미상)"}
          </Banner>
        )}

        {account ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                @{account.ig_username ?? "(unknown)"}
              </p>
              <p className="text-xs text-text-secondary">
                Facebook Page: {account.fb_page_name ?? "(unknown)"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                토큰 만료: {expiresLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/instagram/start"
                className="btn-secondary text-xs"
              >
                <LinkIcon className="h-3.5 w-3.5" /> 재연결
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="btn-ghost text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                연결 해제
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">
              아직 연결된 Instagram 계정이 없습니다.
            </p>
            <Link href="/auth/instagram/start" className="btn-primary text-xs">
              <Instagram className="h-3.5 w-3.5" /> Facebook 으로 Instagram 연결
            </Link>
            <p className="text-xs text-text-muted">
              사전 조건: Instagram이 Business/Creator 타입이고 Facebook
              Page에 연결되어 있어야 합니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatExpires(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.max(
    0,
    Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return `${d.toLocaleDateString("ko-KR")} (D-${days})`;
}

function Banner({
  kind,
  children,
  onClose,
}: {
  kind: "ok" | "error";
  children: React.ReactNode;
  onClose: () => void;
}) {
  const Icon = kind === "ok" ? Check : CircleAlert;
  const color =
    kind === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-red-500/30 bg-red-500/10 text-red-400";
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${color}`}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1 break-words">{children}</span>
      <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">
        ×
      </button>
    </div>
  );
}
