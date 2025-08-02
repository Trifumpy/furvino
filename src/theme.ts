'use client';
import { createTheme } from '@mui/material/styles';

export const BODY_FONT_VAR = '--font-body-main';
export const BODY_MONO_VAR = '--font-mono-main';
export const HEADER_FONT_VAR = '--font-header-main';

const theme = createTheme({ 
  typography: {
    fontFamily: `var(${BODY_FONT_VAR})`,
  },
});

export default theme;
