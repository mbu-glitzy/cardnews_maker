import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandForm } from "../brand-form";

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <Link
          href="/brands"
          className="mb-3 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-3 w-3" /> 브랜드 목록
        </Link>
        <h1 className="text-2xl font-bold">새 브랜드 프로파일</h1>
      </header>
      <BrandForm />
    </div>
  );
}
