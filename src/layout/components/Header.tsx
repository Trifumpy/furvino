import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { Auth } from "../Auth";

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
        <Button LinkComponent={Link} href="/" color="inherit">
          Browse
        </Button>
        <Button LinkComponent={Link} href="/favorites" color="inherit">
          Favorites
        </Button>
        <Box flexGrow={1} />
        <Auth />
      </Toolbar>
    </AppBar>
  );
}
