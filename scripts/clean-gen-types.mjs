import { readFileSync, writeFileSync } from "node:fs";

/**
 * supabase gen types 결과 끝에 붙는 Claude Code 플러그인 메타데이터
 * (<claude-code-hint ... />) 를 제거.
 */
const FILE = "src/types/supabase.gen.ts";

const content = readFileSync(FILE, "utf8");
const cleaned =
  content.replace(/<claude-code-hint\b[^>]*\/>\s*$/m, "").trimEnd() + "\n";

writeFileSync(FILE, cleaned);
console.log(`✓ Cleaned ${FILE}`);
