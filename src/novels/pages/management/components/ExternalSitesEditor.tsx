import {
  CreateNovelBody,
  EXTERNAL_SITES,
  ExternalSite,
} from "@/contracts/novels";
import { SERVICE_ICONS, SERVICE_NAMES } from "@/generic/data";
import { useRecordArrayAdapter } from "@/generic/hooks";
import { KeyMapKey, StringKeyMapField } from "@/generic/input";
import { Stack, Typography } from "@mui/material";
import { LinkIcon } from "lucide-react";

export const keys: KeyMapKey<ExternalSite>[] = EXTERNAL_SITES.map((site) => ({
  label: SERVICE_NAMES[site],
  Icon: SERVICE_ICONS[site],
  value: site,
}));

type Props = {
  value: CreateNovelBody["externalUrls"];
  onChange: (value: CreateNovelBody["externalUrls"]) => void;
  errors?: Record<ExternalSite, string>;
};

export function ExternalSitesEditor({ value, onChange, errors }: Props) {
  const [mapping, setMapping] = useRecordArrayAdapter<ExternalSite, string>(
    value ?? {},
    onChange
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
        <LinkIcon size={20} />
        <Typography variant="h5">External Links</Typography>
      </Stack>
      <StringKeyMapField<ExternalSite>
        keys={keys}
        value={mapping}
        onChange={setMapping}
        errors={errors}
      />
    </Stack>
  );
}
