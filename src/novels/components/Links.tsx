import { IconButton, Stack, StackProps, Tooltip } from "@mui/material";
import { ExternalSite, Novel } from "../types";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BlueskyIcon,
  DiscordIcon,
  ItchIcon,
  PatreonIcon,
  TwitterXIcon,
} from "@/generic/icons";

type Props = StackProps & {
  novel: Novel;
};

const SERVICES = ["bluesky", "discord", "itch", "patreon", "x"] as const;

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
};
const SERVICE_ICONS: Record<ExternalSite, LucideIcon> = {
  discord: DiscordIcon,
  itch: ItchIcon,
  patreon: PatreonIcon,
  bluesky: BlueskyIcon,
  x: TwitterXIcon,
};

function LinkButton({ href, service }: LinkProps) {
  if (!href) return null;

  const serviceName = SERVICE_NAMES[service];
  const Icon = SERVICE_ICONS[service];

  return (
    <Tooltip title={serviceName}>
      <IconButton LinkComponent={Link} href={href}>
        <Icon size={32} />
      </IconButton>
    </Tooltip>
  );
}
