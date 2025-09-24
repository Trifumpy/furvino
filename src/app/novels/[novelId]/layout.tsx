import type { Metadata } from "next";
import { PropsWithChildren } from "react";
import { SETTINGS } from "@/app/api/settings";
import { NextParams } from "@/app/types";
import { NovelProvider } from "@/novels/providers/NovelProvider";
import { Box } from "@mui/material";
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
  const raw = await ensureGetNovel(novelId);
  const pageBackgroundUrl = (raw as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl || undefined;
  const foregroundOpacityPercent = (raw as unknown as { foregroundOpacityPercent?: number }).foregroundOpacityPercent ?? 95;
  const foregroundColorHex = (raw as unknown as { foregroundColorHex?: string | null }).foregroundColorHex || "#121212";

  return (
    <NovelProvider novelId={novelId}>
      {pageBackgroundUrl && (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            backgroundImage: `url(${pageBackgroundUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {pageBackgroundUrl && (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          }}
        />
      )}
      <Box sx={{ minHeight: "100dvh" }}>
        <Box
          sx={{
            position: "relative",
            mx: { xs: 0, md: "auto" },
            width: { xs: "100%", md: "auto" },
            maxWidth: { xs: "100%", md: 1200 },
            minHeight: "100dvh",
            borderRadius: { xs: 2, md: 2 },
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
            bgcolor: foregroundColorHex,
              opacity: Math.max(0, Math.min(100, foregroundOpacityPercent)) / 100,
            }}
          />
          <Box sx={{ position: "relative", px: { xs: 1, sm: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </NovelProvider>
  );
}
