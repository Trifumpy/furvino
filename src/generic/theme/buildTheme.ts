import { createTheme, PaletteColor } from "@mui/material";
import { CustomColorKey } from "./colorKeys";

export const BODY_FONT_VAR = "--font-body-main";
export const BODY_MONO_VAR = "--font-mono-main";
export const HEADER_FONT_VAR = "--font-header-main";

export function buildTheme() {
  const baseTheme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#90caf9" },
      secondary: { main: "#f48fb1" },
      background: { default: "#121212", paper: "#1e1e1e" },
    },
    components: {
      MuiPopover: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
    },
    typography: { fontFamily: `var(${BODY_FONT_VAR})` },
  });

  function augment(name: string, color: string) {
    return baseTheme.palette.augmentColor({
      color: {
        main: color,
      },
      name,
    });
  }

  return createTheme(baseTheme, {
    palette: {
      red: augment("red", "#f44336"),
      green: augment("green", "#4caf50"),
      blue: augment("blue", "#2196f3"),
      yellow: augment("yellow", "#ffeb3b"),
      purple: augment("purple", "#9c27b0"),
      orange: augment("orange", "#ff9800"),
      pink: augment("pink", "#e91e63"),
      cyan: augment("cyan", "#00bcd4"),
      brown: augment("brown", "#795548"),
      grey: augment("grey", "#9e9e9e"),
      black: augment("black", "#000000"),
      white: augment("white", "#ffffff"),
    } satisfies Record<CustomColorKey, PaletteColor>,
  });
}
