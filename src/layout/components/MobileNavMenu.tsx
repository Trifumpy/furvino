"use client";

import { useState, MouseEvent } from "react";
import { IconButton, Menu as MuiMenu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Menu as MenuIcon, Compass as CompassIcon, UserRoundCheck as UserRoundCheckIcon, LibraryBig as LibraryBigIcon, Info as InfoIcon } from "lucide-react";
import Link from "next/link";

export function MobileNavMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  function handleOpen(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  return (
    <>
      <IconButton color="inherit" aria-label="menu" onClick={handleOpen}>
        <MenuIcon />
      </IconButton>
      <MuiMenu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        keepMounted
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem component={Link} href="/" onClick={handleClose}>
          <ListItemIcon>
            <CompassIcon size={18} />
          </ListItemIcon>
          <ListItemText>Browse</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/following" onClick={handleClose}>
          <ListItemIcon>
            <UserRoundCheckIcon size={18} />
          </ListItemIcon>
          <ListItemText>Following</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/collections" onClick={handleClose}>
          <ListItemIcon>
            <LibraryBigIcon size={18} />
          </ListItemIcon>
          <ListItemText>Collections</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/about" onClick={handleClose}>
          <ListItemIcon>
            <InfoIcon size={18} />
          </ListItemIcon>
          <ListItemText>About</ListItemText>
        </MenuItem>
      </MuiMenu>
    </>
  );
}


