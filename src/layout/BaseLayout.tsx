import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./ThemeProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

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
    <ClerkProvider appearance={{ theme: dark }}>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <AppRouterCacheProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </AppRouterCacheProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
