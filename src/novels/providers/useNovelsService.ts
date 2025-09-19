"use client";

import { useMemo } from "react";
import { NovelsService } from "@/utils/services/novels";
import { SETTINGS } from "@/app/api/settings";

export function useNovelsService() {
  return useMemo(() => new NovelsService(SETTINGS.apiUrl), []);
}


