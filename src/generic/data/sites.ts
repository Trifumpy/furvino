import { ExternalSite } from "@/contracts/novels";
import { LucideIcon } from "lucide-react";
import { BlueskyIcon, CarrdIcon, DiscordIcon, FuraffinityIcon, ItchIcon, LinktreeIcon, PatreonIcon, TelegramIcon, TwitterXIcon, YoutubeIcon } from "../icons";

export const SERVICE_NAMES: Record<ExternalSite, string> = {
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
export const SERVICE_ICONS: Record<ExternalSite, LucideIcon> = {
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