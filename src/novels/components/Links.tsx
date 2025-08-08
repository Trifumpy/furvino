import { IconButton, Stack, StackProps, Tooltip } from "@mui/material";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BlueskyIcon,
  CarrdIcon,
  DiscordIcon,
  FuraffinityIcon,
  ItchIcon,
  LinktreeIcon,
  PatreonIcon,
  TelegramIcon,
  TwitterXIcon,
  YoutubeIcon,
} from "@/generic/icons";
import {
  ExternalSite,
  externalSiteEnum,
  ListedNovel,
} from "@/contracts/novels";

type Props = StackProps & {
  novel: ListedNovel;
};

const SERVICES = Object.values(externalSiteEnum.enum);

export function Links({ novel, ...props }: Props) {
  const links = novel.externalUrls;

  if (!links) return null;

  return (
    <Stack direction="row" gap={2} {...props}>
      {SERVICES.map(
        (service) =>
          links[service] && (
            <LinkButton key={service} href={links[service]} service={service} />
          )
      )}
    </Stack>
  );
}

type LinkProps = {
  href: string;
  service: ExternalSite;
};

const SERVICE_NAMES: Record<ExternalSite, string> = {
  discord: "Discord",
  itch: "Itch.io",
  patreon: "Patreon",
  bluesky: "Bluesky",
  x: "X",
  linktree: "Linktree",
  carrd: "Carrd",
  furaffinity: "Fur Affinity",
  youtube: "YouTube",
  telegram: "Telegram",
};
const SERVICE_ICONS: Record<ExternalSite, LucideIcon> = {
  discord: DiscordIcon,
  itch: ItchIcon,
  patreon: PatreonIcon,
  bluesky: BlueskyIcon,
  x: TwitterXIcon,
  carrd: CarrdIcon,
  linktree: LinktreeIcon,
  furaffinity: FuraffinityIcon,
  youtube: YoutubeIcon,
  telegram: TelegramIcon,
};

function LinkButton({ href, service }: LinkProps) {
  if (!href) return null;

  const serviceName = SERVICE_NAMES[service];
  const Icon = SERVICE_ICONS[service];

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
