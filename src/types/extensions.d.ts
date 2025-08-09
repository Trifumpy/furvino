declare module '@mui/material/styles' {
  interface Palette {
    red: Palette['primary'],
    green: Palette['primary'],
    blue: Palette['primary'],
    yellow: Palette['primary'],
    purple: Palette['primary'],
    orange: Palette['primary'],
    pink: Palette['primary'],
    cyan: Palette['primary'],
    brown: Palette['primary'],
    grey: Palette['primary'],
    black: Palette['primary'],
    white: Palette['primary'],
  }

  interface PaletteOptions {
    red?: PaletteOptions['primary'],
    green?: PaletteOptions['primary'],
    blue?: PaletteOptions['primary'],
    yellow?: PaletteOptions['primary'],
    purple?: PaletteOptions['primary'],
    orange?: PaletteOptions['primary'],
    pink?: PaletteOptions['primary'],
    cyan?: PaletteOptions['primary'],
    brown?: PaletteOptions['primary'],
    grey?: PaletteOptions['primary'],
    black?: PaletteOptions['primary'],
    white?: PaletteOptions['primary'],
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    red: true;
    green: true;
    blue: true;
    yellow: true;
    purple: true;
    orange: true;
    pink: true;
    cyan: true;
    brown: true;
    grey: true;
    black: true;
    white: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    red: true;
    green: true;
    blue: true;
    yellow: true;
    purple: true;
    orange: true;
    pink: true;
    cyan: true;
    brown: true;
    grey: true;
    black: true;
    white: true;
  }
}
