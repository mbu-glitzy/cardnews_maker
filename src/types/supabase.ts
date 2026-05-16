/**
 * Supabase 타입 wrapper.
 *
 * - 자동 생성된 타입(supabase.gen.ts) 을 re-export
 * - 자주 쓰는 enum/유틸 타입에 짧은 별칭 부여
 *
 * 자동 생성 갱신: `npm run gen:types`
 */

import type { Database } from "./supabase.gen";

export type { Database, Json } from "./supabase.gen";

export type AiOperation = Database["public"]["Enums"]["ai_operation"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type CardRole = Database["public"]["Enums"]["card_role"];

// 자주 쓰는 Row 타입 단축
export type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];
