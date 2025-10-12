"use client";

import { useState, MouseEvent } from "react";
import { IconButton, Menu as MuiMenu, MenuItem } from "@mui/material";
import { Menu as MenuIcon } from "lucide-react";
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
          Browse
        </MenuItem>
        <MenuItem component={Link} href="/following" onClick={handleClose}>
          Following
        </MenuItem>
        <MenuItem component={Link} href="/collections" onClick={handleClose}>
          Collections
        </MenuItem>
        <MenuItem component={Link} href="/about" onClick={handleClose}>
          About
        </MenuItem>
      </MuiMenu>
    </>
  );
}


