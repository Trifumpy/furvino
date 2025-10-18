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
  const [platformProgress, setPlatformProgress] = useState<Record<Platform, { loaded: number; total: number; percent: number; etaSeconds: number }>>({} as Record<Platform, { loaded: number; total: number; percent: number; etaSeconds: number }>);
  const activeUploadsRef = useRef<Map<Platform, XMLHttpRequest>>(new Map());

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
      activeUploadsRef.current.forEach((xhr) => {
        xhr.abort();
      });
      activeUploadsRef.current.clear();
    };
  }, []);

  const uploadForPlatform = async (platform: Platform, file: File, onProgressUpdate: (p: { loaded: number; total: number; percent: number; etaSeconds: number }) => void): Promise<ListedNovel> => {
    if (!novelId) {
      throw new Error("Novel ID is required");
    }

    return new Promise<ListedNovel>((resolve, reject) => {
      // Cancel any existing upload for this platform
      const existingXhr = activeUploadsRef.current.get(platform);
      if (existingXhr) {
        existingXhr.abort();
        activeUploadsRef.current.delete(platform);
      }

      const xhr = new XMLHttpRequest();
      activeUploadsRef.current.set(platform, xhr);
      
      const formData = new FormData();
      formData.append("file", file);
      const startTime = Date.now();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const elapsedMs = Date.now() - startTime;
          const bytesPerMs = e.loaded > 0 && elapsedMs > 0 ? e.loaded / elapsedMs : 0;
          const remainingBytes = Math.max(e.total - e.loaded, 0);
          const etaSeconds = bytesPerMs > 0 ? Math.ceil(remainingBytes / bytesPerMs / 1000) : 0;
          onProgressUpdate({ loaded: e.loaded, total: e.total, percent, etaSeconds });
        }
      });

      xhr.addEventListener("load", () => {
        activeUploadsRef.current.delete(platform);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as ListedNovel;
            resolve(result);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err}`));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      });

      xhr.addEventListener("error", () => {
        activeUploadsRef.current.delete(platform);
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        activeUploadsRef.current.delete(platform);
        reject(new Error("Upload aborted"));
      });

      xhr.open("PUT", `/api/novels/${novelId}/files/${platform}/upload-via-api`);
      xhr.send(formData);
    });
  };

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
            
            try {
              setUploadingPlatforms((prev) => new Set(prev).add(itemKey));
              
              const novel = await uploadForPlatform(itemKey, file, (p) => {
                setPlatformProgress((prev) => ({ ...prev, [itemKey]: p }));
              });
              
              const url = novel.downloadUrls?.[itemKey] ?? "";
              onChange(url);
              toast.success(`${PLATFORM_NAMES[itemKey]} upload successful`);
            } catch (err) {
              toast.error((err as Error).message || "Upload failed");
            } finally {
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
            Uploading: {thisProgress.percent}%
            {thisProgress.etaSeconds > 0 && ` • ETA: ${thisProgress.etaSeconds}s`}
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
