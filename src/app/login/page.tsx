"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  type AuthResult,
} from "./actions";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let res: AuthResult;
      if (mode === "signin") {
        res = await signInWithPassword(formData);
      } else {
        res = await signUpWithPassword(formData);
      }
      if (!res.ok) setError(res.error);
      // ok 시엔 server action 내부에서 redirect
    });
  }

  const isSignUp = mode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <h1 className="mb-1 text-2xl font-bold">카드뉴스 메이커</h1>
          <p className="text-sm text-text-secondary">
            {isSignUp ? "새 계정을 만드세요" : "이메일과 비밀번호로 로그인"}
          </p>
        </div>

        <form action={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="input"
              disabled={pending}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="최소 6자"
              className="input"
              disabled={pending}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isSignUp ? "가입 중..." : "로그인 중..."}
              </>
            ) : isSignUp ? (
              "회원가입"
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-text-secondary">
          {isSignUp ? (
            <>
              이미 계정이 있나요?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="text-accent hover:text-accent-hover"
              >
                로그인
              </button>
            </>
          ) : (
            <>
              처음이신가요?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="text-accent hover:text-accent-hover"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
