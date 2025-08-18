import { CreateNovelBody, PLATFORMS, Platform } from "@/contracts/novels";
import { PLATFORM_ICONS, PLATFORM_NAMES } from "@/generic/data";
import { FileOrUrlInput, KeyMapField, KeyMapKey } from "@/generic/input";
import { useRecordArrayAdapter } from "@/generic/hooks";
import { Stack, Typography } from "@mui/material";
import { DownloadIcon } from "lucide-react";
import { useUploadNovelFile } from "@/novels/hooks";
import { ValueFieldProps } from "@/generic/input/KeyMapField";

export const keys: KeyMapKey<Platform>[] = PLATFORMS.map((platform) => ({
  label: PLATFORM_NAMES[platform],
  Icon: PLATFORM_ICONS[platform],
  value: platform,
}));

type Props = {
  value: CreateNovelBody["magnetUrls"];
  onChange: (value: CreateNovelBody["magnetUrls"]) => void;
  errors?: Record<Platform, string>;
  novelId?: string;
};

export function DownloadsEditor({ value, onChange, errors, novelId }: Props) {
  const [mapping, setMapping] = useRecordArrayAdapter<Platform, string>(
    value ?? {},
    onChange
  );

  const { uploadFile, isUploading } = useUploadNovelFile();

  const ValueField = ({ itemKey, value, onChange, error, disabled }: ValueFieldProps<Platform, string>) => (
    <FileOrUrlInput<Platform>
      itemKey={itemKey}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      loading={isUploading}
      onUpload={async (file) => {
        if (!novelId) return;
        const novel = await uploadFile({ novelId, platform: itemKey, file });
        const url = novel.magnetUrls?.[itemKey] ?? "";
        onChange(url);
      }}
    />
  );

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
