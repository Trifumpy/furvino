"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNovel } from "./ClientNovelProvider";
import type { ShareUploadConfig } from "@/utils/client/stackUpload";
import type { GetUploadTokenResponse } from "@/app/api/novels/[novelId]/upload-token/route";

type UploadContext = {
  config: ShareUploadConfig | null;
  isReady: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
};

const NovelUploadContext = createContext<UploadContext>({
  config: null,
  isReady: false,
  error: null,
  refreshToken: async () => {},
});

type Props = PropsWithChildren<{
  novelId: string;
}>;

const TOKEN_RENEWAL_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const ENABLE_DIRECT_UPLOADS = process.env.NEXT_PUBLIC_ENABLE_DIRECT_STACK_UPLOADS !== "false";

export function NovelUploadProvider({ novelId, children }: Props) {
  const { canEdit } = useNovel();
  const [config, setConfig] = useState<ShareUploadConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareIDRef = useRef<number | null>(null);
  const renewalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRenewal = useCallback((expiresAt: number, renewFn: () => Promise<void>) => {
    // Clear any existing timer
    if (renewalTimerRef.current) {
      clearTimeout(renewalTimerRef.current);
    }

    const expiresAtMs = expiresAt * 1000;
    const now = Date.now();
    const timeUntilRenewal = expiresAtMs - now - TOKEN_RENEWAL_THRESHOLD;

    if (timeUntilRenewal > 0) {
      renewalTimerRef.current = setTimeout(() => {
        console.log("Renewing upload token...");
        renewFn();
      }, timeUntilRenewal);
    }
  }, []);

  const requestToken = useCallback(async () => {
    if (!canEdit || !ENABLE_DIRECT_UPLOADS) {
      return;
    }

    try {
      setError(null);
      
      // Request upload token from backend
      const response = await fetch(`/api/novels/${novelId}/upload-token`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Failed to get upload token (${response.status}): ${errorText}`);
      }

      const data: GetUploadTokenResponse = await response.json();
      shareIDRef.current = data.shareID;

      // Backend already authorized the share and returned the shareToken
      const uploadConfig: ShareUploadConfig = {
        shareURLToken: data.shareURLToken,
        shareToken: data.shareToken,
        parentNodeID: data.parentNodeID,
        expiresAt: data.expiresAt,
        stackApiUrl: data.stackApiUrl,
      };

      setConfig(uploadConfig);
      setIsReady(true);

      // Schedule token renewal
      scheduleRenewal(data.expiresAt, requestToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to initialize upload token (will fall back to VPS upload):", err);
      setIsReady(false);
      // Don't throw - just log and continue without direct upload
    }
  }, [canEdit, novelId, scheduleRenewal]);

  const revokeToken = useCallback(async () => {
    if (!shareIDRef.current) {
      return;
    }

    try {
      await fetch(`/api/novels/${novelId}/upload-token/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shareID: shareIDRef.current }),
      });
    } catch (err) {
      console.error("Failed to revoke upload token:", err);
    }

    shareIDRef.current = null;
  }, [novelId]);

  // Initialize token on mount
  useEffect(() => {
    if (canEdit && ENABLE_DIRECT_UPLOADS) {
      requestToken();
    }

    // Cleanup on unmount
    return () => {
      if (renewalTimerRef.current) {
        clearTimeout(renewalTimerRef.current);
      }
      revokeToken();
    };
  }, [canEdit, requestToken, revokeToken]);

  return (
    <NovelUploadContext.Provider
      value={{
        config,
        isReady,
        error,
        refreshToken: requestToken,
      }}
    >
      {children}
    </NovelUploadContext.Provider>
  );
}

export function useNovelUpload() {
  return useContext(NovelUploadContext);
}

