import {
  CreateNovelBody,
  MAX_NOVEL_FILE_SIZE,
  PLATFORMS,
  Platform,
} from "@/contracts/novels";
import { PLATFORM_ICONS, PLATFORM_NAMES } from "@/generic/data";
import { FileOrUrlInput, KeyMapField, KeyMapKey } from "@/generic/input";
import { useRecordArrayAdapter } from "@/generic/hooks";
import { Stack, Typography } from "@mui/material";
import { DownloadIcon } from "lucide-react";
import { useUploadNovelFile } from "@/novels/hooks";
import { ValueFieldProps } from "@/generic/input/KeyMapField";
import { toast } from "react-toastify";

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

  const ValueField = ({
    itemKey,
    value,
    onChange,
    error,
    disabled,
  }: ValueFieldProps<Platform, string>) => {
    const { uploadFile, isUploading, progress } = useUploadNovelFile();
    return (
      <FileOrUrlInput<Platform>
        itemKey={itemKey}
        label={`File for ${PLATFORM_NAMES[itemKey] ?? "-"}`}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        loading={isUploading}
        progressPercent={progress?.percent}
        etaSeconds={progress?.etaSeconds}
        maxSize={MAX_NOVEL_FILE_SIZE}
        onUpload={async (file) => {
          if (!novelId) return;
          const novel = await uploadFile({ novelId, platform: itemKey, file });
          const url = novel.downloadUrls?.[itemKey] ?? "";
          onChange(url);
          toast.success("Upload successful");
        }}
      />
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
      />
    </Stack>
  );
}
