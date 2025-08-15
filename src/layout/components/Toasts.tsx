"use client";

import { useTheme } from "@mui/material";
import { ToastContainer } from "react-toastify";

export function Toasts() {
  const theme = useTheme();

  return <ToastContainer position="bottom-right" theme={theme.palette.mode} />;
}
