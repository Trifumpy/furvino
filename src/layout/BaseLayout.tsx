import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CoreProvider } from "./CoreProvider";
import { PropsWithChildren } from "react";

// Font variables should be defined in theme.ts
// However, Next.js font optimization requires literals
const geistSans = Geist({
  variable: "--font-body-main",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono-main",
  subsets: ["latin"],
});

export function BaseLayout({ children }: PropsWithChildren) {
  return (
    <CoreProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <AppRouterCacheProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </AppRouterCacheProvider>
        </body>
      </html>
    </CoreProvider>
  );
}
