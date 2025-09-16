import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { Auth } from "./Auth";
import { MobileNavMenu } from "./MobileNavMenu";

export function Header() {
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <Link href="/" aria-label="Furvino home" style={{ textDecoration: "none", color: "inherit" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Box component="img" src="/icon.svg" alt="Furvino" sx={{ width: 28, height: 28, filter: "brightness(0) invert(0.85)" }} />
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
          <Button LinkComponent={Link} href="/" color="inherit">
            Browse
          </Button>
          <Button LinkComponent={Link} href="/collections" color="inherit">
            Collections
          </Button>
          <Button LinkComponent={Link} href="/about" color="inherit">
            About
          </Button>
        </Box>
        {/* Mobile burger menu */}
        <Box sx={{ display: { xs: "flex", sm: "none" } }}>
          <MobileNavMenu />
        </Box>
        <Box flexGrow={1} />
        <Auth />
      </Toolbar>
    </AppBar>
  );
}
