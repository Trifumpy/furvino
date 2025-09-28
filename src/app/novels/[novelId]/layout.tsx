import type { Metadata } from "next";
import { PropsWithChildren } from "react";
import { SETTINGS } from "@/app/api/settings";
import { NextParams } from "@/app/types";
import { NovelProvider } from "@/novels/providers/NovelProvider";
import { ensureGetNovel } from "@/app/api/novels/utils";

type Props = PropsWithChildren<
  NextParams<{
    novelId: string;
  }>
>;

export async function generateMetadata(
  { params }: { params: Promise<{ novelId: string }> }
): Promise<Metadata> {
  const { novelId } = await params;
  try {
    const res = await fetch(`${SETTINGS.apiUrl}/novels/${novelId}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const novel: { title: string } = await res.json();
    return { title: novel.title };
  } catch {
    return { title: "Novel" };
  }
}

export default async function Layout({ children, params }: Props) {
  const { novelId } = await params;
  await ensureGetNovel(novelId);

  return (
    <NovelProvider novelId={novelId}>
      {children}
    </NovelProvider>
  );
}
