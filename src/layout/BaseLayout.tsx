import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./ThemeProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

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

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppRouterCacheProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
