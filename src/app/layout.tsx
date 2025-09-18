import type { Metadata } from "next";
import { metadataBaseUrl } from "@/utils/site";
import "./globals.css";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Header, BaseLayout } from "@/layout";

export const metadata: Metadata = {
  title: "Furvino",
  description: "Discover your next story",
  metadataBase: metadataBaseUrl,
  alternates: { canonical: "/" },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
  },
  openGraph: {
    title: "Furvino",
    description: "Furry Visual Novels- Discover your next story",
    type: "website",
    siteName: "Furvino",
  },
  twitter: {
    card: "summary_large_image",
    title: "Furvino",
    description: "Furry Visual Novels- Discover your next story",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg" },
    ],
    shortcut: ["/icon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BaseLayout>
      <Stack minHeight="100dvh">
        <Header />
        <Container sx={{ py: 4 }}>{children}</Container>
        <Box flexGrow={1} />
        <Footer />
      </Stack>
    </BaseLayout>
  );
}

function Footer() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: "background.paper", p: 2, mt: "auto" }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        &copy; {new Date().getFullYear()} Furvino
      </Typography>
    </Box>
  );
}
