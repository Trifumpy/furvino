import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { Auth } from "./Auth";
import { MobileNavMenu } from "./MobileNavMenu";

export function Header() {
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          sx={{ flexGrow: 1, cursor: "pointer" }}
          href="/"
        >
          FurViNo
        </Typography>
        {/* Desktop nav */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
          <Button LinkComponent={Link} href="/" color="inherit">
            Browse
          </Button>
          <Button LinkComponent={Link} href="/favorites" color="inherit">
            Favorites
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
