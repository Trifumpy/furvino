"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { ListedNovel, Platform } from "@/contracts/novels";
import { useEffect, useMemo, useState } from "react";
import { detectPlatform } from "@/utils";
import { Button, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { PLATFORM_ICONS, PLATFORM_NAMES } from "@/generic/data";

type Props = {
  novel: ListedNovel;
  buttonBgColor?: string;
  buttonTextColor?: string;
};

const BUTTON_HEIGHT = 48;

export function NovelDownloads({ novel, buttonBgColor, buttonTextColor }: Props) {
  const downloads = novel.downloadUrls;

  const platformOptions = useMemo(() => {
    return Object.keys(downloads ?? {}).filter(
      (platform) => downloads?.[platform as Platform]
    ) as Platform[];
  }, [downloads]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const alternativePlatforms = useMemo(
    () => platformOptions.filter((p) => p !== selectedPlatform),
    [platformOptions, selectedPlatform]
  );
  const hasAlternatives = alternativePlatforms.length > 0;

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
          bgcolor: buttonBgColor,
          color: buttonTextColor,
          '&:hover': { bgcolor: buttonBgColor },
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
        aria-controls={hasAlternatives ? "platform-menu" : undefined}
        aria-haspopup="true"
        disabled={!hasAlternatives}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasAlternatives) {
            setAnchorEl(e.currentTarget);
          }
        }}
        sx={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          height: BUTTON_HEIGHT,
          minWidth: 0,
          bgcolor: buttonBgColor,
          color: buttonTextColor,
          '&:hover': { bgcolor: buttonBgColor },
        }}
      >
        {anchorEl ? <ChevronUpIcon size={24} /> : <ChevronDownIcon size={24} />}
      </Button>
      <Menu
        id="platform-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && hasAlternatives}
        onClose={() => setAnchorEl(null)}
      >
        {alternativePlatforms.map((platform) => {
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
