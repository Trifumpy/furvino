"use client";

import { useEffect, useMemo, useState } from "react";
import { ListedNovel } from "@/contracts/novels";
import { NovelsService } from "@/utils/services/novels";
import { SETTINGS } from "@/app/api/settings";

export function useGetNovelsByAuthor(authorId?: string) {
  const [novels, setNovels] = useState<ListedNovel[]>([]);
  const [loading, setLoading] = useState(false);
  const service = useMemo(() => new NovelsService(SETTINGS.apiUrl), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!authorId) {
        setNovels([]);
        return;
      }
      setLoading(true);
      try {
        const res = await service.getNovels({ authorId, page: 1, pageSize: 100 });
        if (!cancelled) setNovels(res.items);
      } catch {
        if (!cancelled) setNovels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [authorId, service]);

  return { novels, loading };
}


