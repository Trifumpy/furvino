import {
  CreateNovelBody,
  MAX_NOVEL_FILE_SIZE,
  PLATFORMS,
  Platform,
  ListedNovel,
} from "@/contracts/novels";
import { PLATFORM_ICONS, PLATFORM_NAMES } from "@/generic/data";
import { FileOrUrlInput, KeyMapField, KeyMapKey } from "@/generic/input";
import { useRecordArrayAdapter } from "@/generic/hooks";
import { Stack, Typography } from "@mui/material";
import { DownloadIcon } from "lucide-react";
import { useDeleteNovelFile } from "@/novels/hooks";
import { ValueFieldProps } from "@/generic/input/KeyMapField";
import { toast } from "react-toastify";
import { useEffect, useState, useMemo, useRef } from "react";
import { uploadFileInParallel } from "@/utils/client/parallelUploader";
import { getUploadFolder } from "@/novels/utils";

export const keys: KeyMapKey<Platform>[] = PLATFORMS.map((platform) => ({
  label: PLATFORM_NAMES[platform],
  Icon: PLATFORM_ICONS[platform],
  value: platform,
}));

type Props = {
  value: CreateNovelBody["downloadUrls"];
  onChange: (value: CreateNovelBody["downloadUrls"]) => void;
  errors?: Record<Platform, string>;
  novelId?: string;
};

type UploadStats = {
  loaded: number;
  total: number;
  percent: number;
  etaSeconds: number;
  concurrency: number;
  partSize: number;
  mbps: number;
}

export function DownloadsEditor({ value, onChange, errors, novelId }: Props) {
  // Ensure all platforms are always visible
  const allPlatformsValue = useMemo(() => {
    const result: Record<Platform, string> = {} as Record<Platform, string>;
    PLATFORMS.forEach((platform) => {
      result[platform] = (value?.[platform] as string) || "";
    });
    return result;
  }, [value]);

  const [mapping, setMapping] = useRecordArrayAdapter<Platform, string>(
    allPlatformsValue,
    onChange
  );
  const { deleteFile } = useDeleteNovelFile();
  const [uploadingPlatforms, setUploadingPlatforms] = useState<Set<Platform>>(new Set());
  const [platformProgress, setPlatformProgress] = useState<Record<Platform, UploadStats>>({} as Record<Platform, UploadStats>);
  const activeUploadsRef = useRef<Map<Platform, AbortController>>(new Map());

  const anyUploading = uploadingPlatforms.size > 0;

  // Prevent navigating away while any upload is in progress
  useEffect(() => {
    if (!anyUploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyUploading]);

  // Clean up all active uploads on unmount
  useEffect(() => {
    return () => {
      activeUploadsRef.current.forEach((controller) => {
        controller.abort();
      });
      activeUploadsRef.current.clear();
    };
  }, []);

  const ValueField = ({
    itemKey,
    value,
    onChange,
    error,
    disabled,
  }: ValueFieldProps<Platform, string>) => {
    const isThisUploading = uploadingPlatforms.has(itemKey);
    const thisProgress = platformProgress[itemKey];
    
    return (
      <Stack gap={0.5}>
        <FileOrUrlInput<Platform>
          itemKey={itemKey}
          label=""
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          loading={isThisUploading}
          progressPercent={thisProgress?.percent}
          etaSeconds={thisProgress?.etaSeconds}
          maxSize={MAX_NOVEL_FILE_SIZE}
          onUpload={async (file) => {
            if (!novelId) {
              toast.error("Novel ID is missing");
              return;
            }
            
            // Prevent concurrent uploads - only allow one at a time
            if (anyUploading) {
              toast.error("Please wait for the current upload to complete before starting a new one");
              return;
            }
            
            const controller = new AbortController();
            activeUploadsRef.current.set(itemKey, controller);

            try {
              setUploadingPlatforms((prev) => new Set(prev).add(itemKey));
              
              const targetFolder = getUploadFolder(novelId, itemKey);
              const { stackPath, shareUrl } = await uploadFileInParallel({
                file,
                targetFolder,
                filename: file.name,
              }, {
                signal: controller.signal,
                onStats: (stats) => {
                  const percent = Math.round((stats.uploadedBytes / stats.totalBytes) * 100);
              const etaSeconds = stats.mbps > 0 ? Math.ceil((stats.totalBytes - stats.uploadedBytes) / (stats.mbps * 1024 * 1024)) : 0;

                  setPlatformProgress((prev) => ({
                    ...prev,
                    [itemKey]: {
                      loaded: stats.uploadedBytes,
                      total: stats.totalBytes,
                      percent,
                      etaSeconds,
                      concurrency: stats.concurrency,
                  partSize: stats.partSize,
                  mbps: Math.max(stats.mbps, 0),
                    },
                  }));
                },
              });
              
              try {
                const finalizeRes = await fetch(`/api/novels/${novelId}/files/${itemKey}/finalize`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ stackPath, shareUrl }),
                  signal: controller.signal,
                });

                if (!finalizeRes.ok) {
                  const errorText = await finalizeRes.text().catch(() => "");
                  throw new Error(errorText || `Failed to finalize upload for ${itemKey}`);
                }
              } catch (finalizeErr) {
                toast.error((finalizeErr as Error).message || "Failed to finalize upload");
                throw finalizeErr;
              }

              onChange(shareUrl);
              toast.success(`${PLATFORM_NAMES[itemKey]} upload successful`);
            } catch (err) {
              if ((err as Error).name !== 'AbortError') {
                toast.error((err as Error).message || "Upload failed");
              }
            } finally {
              activeUploadsRef.current.delete(itemKey);
              setUploadingPlatforms((prev) => {
                const next = new Set(prev);
                next.delete(itemKey);
                return next;
              });
              setPlatformProgress((prev) => {
                const next = { ...prev };
                delete next[itemKey];
                return next;
              });
            }
          }}
        />
        {isThisUploading && thisProgress && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {`Uploading: ${thisProgress.percent}%`}
            {` • ${(thisProgress.mbps || 0).toFixed(2)} MiB/s`}
            {thisProgress.etaSeconds > 0 && ` • ~${thisProgress.etaSeconds}s remaining`}
            {` • Concurrency: ${thisProgress.concurrency} • Part size: ${(thisProgress.partSize / (1024 * 1024)).toFixed(1)} MiB`}
          </Typography>
        )}
      </Stack>
    );
  };

  return (
    <Stack
      gap={1}
      border="1px solid #ccc"
      borderRadius={2}
      sx={(theme) => ({ borderColor: theme.palette.divider })}
      p={1}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <DownloadIcon size={20} />
        <Typography variant="h5">Files</Typography>
      </Stack>
      <KeyMapField<Platform, string>
        keys={keys}
        value={mapping}
        onChange={setMapping}
        errors={errors}
        ValueField={ValueField}
        onDelete={async (platform) => {
          if (!novelId) return false;
          if (uploadingPlatforms.has(platform)) {
            toast.info(
              `${PLATFORM_NAMES[platform]} upload is in progress. Please wait until it finishes.`
            );
            return false;
          }
          try {
            await deleteFile({ novelId, platform });
            // Clear the value but keep the platform visible
            const newValue = { ...value, [platform]: "" };
            onChange(newValue);
            toast.success("File deleted");
            return false; // Return false to prevent KeyMapField from removing the key
          } catch {
            toast.error("Failed to delete file");
            return false;
          }
        }}
      />
    </Stack>
  );
}
