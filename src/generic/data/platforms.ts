import { Platform } from "@/contracts/novels";
import { BoxesIcon, LucideIcon } from "lucide-react";
import { AndroidIcon, LinuxIcon, MacIcon, WindowsIcon } from "../icons";

export const PLATFORM_ICONS: Record<Platform, LucideIcon> = {
  android: AndroidIcon,
  linux: LinuxIcon,
  mac: MacIcon,
  windows: WindowsIcon,
  other: BoxesIcon,
};

export const PLATFORM_NAMES: Record<Platform, string> = {
  android: "Android",
  linux: "Linux",
  mac: "Mac",
  windows: "Windows",
  other: "Other",
};
