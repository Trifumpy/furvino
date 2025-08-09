import {
  CreateNovelBody,
  EXTERNAL_SITES,
  ExternalSite,
} from "@/contracts/novels";
import { SERVICE_ICONS, SERVICE_NAMES } from "@/generic/data";
import { KeyMapKey, StringKeyMapField } from "@/generic/input";
import { useRecordArrayAdapter } from "@/novels/hooks";

export const keys: KeyMapKey<ExternalSite>[] = EXTERNAL_SITES.map((site) => ({
  label: SERVICE_NAMES[site],
  Icon: SERVICE_ICONS[site],
  value: site,
}));

type Props = {
  value: CreateNovelBody["externalUrls"];
  onChange: (value: CreateNovelBody["externalUrls"]) => void;
};

export function ExternalSitesEditor({ value, onChange }: Props) {
  const [mapping, setMapping] = useRecordArrayAdapter<ExternalSite, string>(
    value ?? {},
    onChange
  );

  return (
    <StringKeyMapField<ExternalSite>
      keys={keys}
      value={mapping}
      onChange={setMapping}
    />
  );
}
