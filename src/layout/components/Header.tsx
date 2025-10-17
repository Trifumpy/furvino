import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { Auth } from "./Auth";
import { MobileNavMenu } from "./MobileNavMenu";
import { SafeImage } from "@/generic/display";
import { Compass as CompassIcon, UserRoundCheck as UserRoundCheckIcon, LibraryBig as LibraryBigIcon, Info as InfoIcon } from "lucide-react";

export function Header() {
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <Link href="/" aria-label="Furvino home" style={{ textDecoration: "none", color: "inherit" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <SafeImage src="/icon.svg" alt="Furvino" width={28} height={28} />
              <Typography
                variant="h6"
                sx={{ display: { xs: "none", sm: "block" }, cursor: "pointer" }}
              >
                Furvino
              </Typography>
            </Stack>
          </Link>
        </Box>
        {/* Desktop nav */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
          <Button LinkComponent={Link} href="/" color="inherit" startIcon={<CompassIcon size={18} />}>
            Browse
          </Button>
          <Button LinkComponent={Link} href="/following" color="inherit" startIcon={<UserRoundCheckIcon size={18} />}>
            Following
          </Button>
          <Button LinkComponent={Link} href="/collections" color="inherit" startIcon={<LibraryBigIcon size={18} />}>
            Collections
          </Button>
          <Button LinkComponent={Link} href="/about" color="inherit" startIcon={<InfoIcon size={18} />}>
            About
          </Button>
        </Box>
        <Box flexGrow={1} />
        {/* Mobile burger menu on the right, before auth icons */}
        <Box sx={{ display: { xs: "flex", sm: "none" }, mr: 1 }}>
          <MobileNavMenu />
        </Box>
        <Auth />
      </Toolbar>
    </AppBar>
  );
}
