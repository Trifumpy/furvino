// filepath: /nextjs-api-app/nextjs-api-app/src/app/layout.tsx
import { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/layout/ThemeProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

export const metadata: Metadata = {
  title: "Next.js API App",
  description: "An application to manage novels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}