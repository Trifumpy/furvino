"use client";

import {
  BoxesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LucideIcon,
} from "lucide-react";
import { Novel, Platform } from "../types";
import { AndroidIcon, LinuxIcon, MacIcon, WindowsIcon } from "@/generic/icons";
import { useEffect, useMemo, useState } from "react";
import { detectPlatform } from "@/utils";
import { Button, Menu, MenuItem, Stack, Typography } from "@mui/material";

type Props = {
  novel: Novel;
};

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

const BUTTON_HEIGHT = 48;

export function NovelDownloads({ novel }: Props) {
  const downloads = novel.magnetUrls;

  const platformOptions = useMemo(() => {
    return Object.keys(downloads ?? {}).filter(
      (platform) => downloads?.[platform as Platform]
    ) as Platform[];
  }, [downloads]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const detected = detectPlatform();
    if (platformOptions.includes(detected)) {
      setSelectedPlatform(detected);
    }
  }, [platformOptions]);

  const SelectedIcon = PLATFORM_ICONS[selectedPlatform];

  return (
    <Stack direction="row" alignItems="center">
      <Button
        variant="contained"
        href={downloads?.[selectedPlatform] ?? "#"}
        disabled={!downloads?.[selectedPlatform]}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
        sx={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          height: BUTTON_HEIGHT,
          textTransform: "none",
        }}
      >
        <Stack direction="row" gap={1} alignItems="center">
          <SelectedIcon size={24} />
          {downloads?.[selectedPlatform] ? (
            <Typography variant="body1">
              Download for {PLATFORM_NAMES[selectedPlatform]}
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">
              Not available for {PLATFORM_NAMES[selectedPlatform]}
            </Typography>
          )}
        </Stack>
      </Button>
      <Button
        variant="contained"
        aria-controls="platform-menu"
        aria-haspopup="true"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          height: BUTTON_HEIGHT,
          minWidth: 0,
        }}
      >
        {anchorEl ? <ChevronUpIcon size={24} /> : <ChevronDownIcon size={24} />}
      </Button>
      <Menu
        id="platform-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {platformOptions
          .filter((p) => p !== selectedPlatform)
          .map((platform) => {
            const Icon = PLATFORM_ICONS[platform];
            return (
              <MenuItem
                key={platform}
                onClick={() => {
                  setSelectedPlatform(platform);
                  setAnchorEl(null);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Icon size={24} />
                <Typography variant="body2">
                  {PLATFORM_NAMES[platform]}
                </Typography>
              </MenuItem>
            );
          })}
      </Menu>
    </Stack>
  );
}
