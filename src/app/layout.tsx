import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "카드뉴스 메이커",
  description: "AI 기반 인스타그램 카드뉴스 자동 생성 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
