"use client";

import { Box } from "@mui/material";
import { sanitizeHtmlAllowlist } from "@/utils/lib/sanitize";

type RichRendererProps = {
  html: string;
};

export function SanitizedHtml({ html }: RichRendererProps) {
  const safe = sanitizeHtmlAllowlist(html);
  return <Box sx={{ color: 'text.primary' }} dangerouslySetInnerHTML={{ __html: safe }} />;
}


