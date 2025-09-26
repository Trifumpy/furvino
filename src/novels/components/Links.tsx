import { IconButton, Stack, StackProps, Tooltip } from "@mui/material";
import Link from "next/link";
import { ExternalSite, EXTERNAL_SITES, ListedNovel } from "@/contracts/novels";
import { SERVICE_ICONS, SERVICE_NAMES } from "@/generic/data";

type Props = StackProps & {
  novel: ListedNovel;
  buttonBgColor?: string;
  buttonTextColor?: string;
};

export function Links({ novel, buttonBgColor, buttonTextColor, ...props }: Props) {
  const links = novel.externalUrls;

  if (!links) return null;

  return (
    <Stack direction="row" gap={2} {...props}>
      {EXTERNAL_SITES.map(
        (site) =>
          links[site] && (
            <LinkButton
              key={site}
              href={links[site]}
              site={site}
              buttonBgColor={buttonBgColor}
              buttonTextColor={buttonTextColor}
            />
          )
      )}
    </Stack>
  );
}

type LinkProps = {
  href: string;
  site: ExternalSite;
  buttonBgColor?: string;
  buttonTextColor?: string;
};

function LinkButton({ href, site, buttonBgColor, buttonTextColor }: LinkProps) {
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
        sx={buttonBgColor
          ? { bgcolor: buttonBgColor, color: buttonTextColor, borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.25)', '&:hover': { bgcolor: buttonBgColor } }
          : { color: 'inherit', borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }
        }
      >
        <Icon size={32} />
      </IconButton>
    </Tooltip>
  );
}
