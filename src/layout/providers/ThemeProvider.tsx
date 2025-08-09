"use client";

import { buildTheme } from "@/generic/theme";
import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";

const theme = buildTheme();

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
