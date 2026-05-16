import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{title}</h1>
      </header>
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <Construction className="mb-3 h-8 w-8 text-text-muted" />
        <p className="mb-1 text-sm font-medium text-text-primary">준비 중인 메뉴입니다</p>
        <p className="text-xs text-text-secondary">{phase}에서 구현됩니다.</p>
      </div>
    </div>
  );
}
