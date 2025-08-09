import { IconButton, Stack, StackProps, Tooltip } from "@mui/material";
import Link from "next/link";
import { ExternalSite, EXTERNAL_SITES, ListedNovel } from "@/contracts/novels";
import { SERVICE_ICONS, SERVICE_NAMES } from "@/generic/data";

type Props = StackProps & {
  novel: ListedNovel;
};

export function Links({ novel, ...props }: Props) {
  const links = novel.externalUrls;

  if (!links) return null;

  return (
    <Stack direction="row" gap={2} {...props}>
      {EXTERNAL_SITES.map(
        (site) =>
          links[site] && (
            <LinkButton key={site} href={links[site]} site={site} />
          )
      )}
    </Stack>
  );
}

type LinkProps = {
  href: string;
  site: ExternalSite;
};

function LinkButton({ href, site }: LinkProps) {
  if (!href) return null;

  const serviceName = SERVICE_NAMES[site];
  const Icon = SERVICE_ICONS[site];

  return (
    <Tooltip title={serviceName}>
      <IconButton
        LinkComponent={Link}
        rel="noopener noreferrer"
        target="_blank"
        href={href}
      >
        <Icon size={32} />
      </IconButton>
    </Tooltip>
  );
}
