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
import { useDeleteNovelFile, useUploadNovelFile } from "@/novels/hooks";
import { ValueFieldProps } from "@/generic/input/KeyMapField";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";

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
  const [mapping, setMapping] = useRecordArrayAdapter<Platform, string>(
    value ?? {},
    onChange
  );
  const { uploadFile, isUploading, progress, stats } = useUploadNovelFile();
  const { deleteFile } = useDeleteNovelFile();
  const [currentPlatform, setCurrentPlatform] = useState<Platform | null>(null);

  // Prevent navigating away while an upload is in progress
  useEffect(() => {
    if (!isUploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isUploading]);

  const ValueField = ({
    itemKey,
    value,
    onChange,
    error,
    disabled,
  }: ValueFieldProps<Platform, string>) => {
    const isThisUploading = isUploading && currentPlatform === itemKey;
    const isOtherUploading = isUploading && currentPlatform !== itemKey;
    return (
      <Stack gap={0.5}>
        <FileOrUrlInput<Platform>
          itemKey={itemKey}
          label=""
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || isOtherUploading}
          loading={isThisUploading}
          progressPercent={isThisUploading ? progress?.percent : undefined}
          etaSeconds={isThisUploading ? progress?.etaSeconds : undefined}
          maxSize={MAX_NOVEL_FILE_SIZE}
          onUpload={async (file) => {
            if (!novelId) return;
            if (isUploading && currentPlatform && currentPlatform !== itemKey) {
              toast.info(
                "Another upload is in progress. Please wait until it finishes."
              );
              return;
            }
            try {
              setCurrentPlatform(itemKey);
              const novel = (await uploadFile({
                novelId,
                platform: itemKey,
                file,
              })) as ListedNovel;
              const url = novel.downloadUrls?.[itemKey] ?? "";
              onChange(url);
              toast.success("Upload successful");
            } finally {
              setCurrentPlatform(null);
            }
          }}
        />
        {isThisUploading && stats && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            Concurrency: {stats.concurrency} (in-flight {stats.inFlight}) • Speed: {stats.mbps.toFixed(2)} MB/s
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
          if (isUploading) {
            toast.info(
              "An upload is in progress. Please wait until it finishes."
            );
            return false;
          }
          try {
            setCurrentPlatform(platform);
            await deleteFile({ novelId, platform });
            // Do not optimistically update mapping; rely on parent data refresh
            toast.success("File deleted");
            return true;
          } catch {
            toast.error("Failed to delete file");
            return false;
          } finally {
            setCurrentPlatform(null);
          }
        }}
      />
    </Stack>
  );
}
