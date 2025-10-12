"use client";

import { Alert, Button, Collapse, Grid, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useUser } from "@/users/providers";
import { useRegistry } from "@/utils/client";
import { SanitizedHtml } from "@/generic/display";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize } from "@/generic/input/extensions/FontSize";
import { HorizontalRuleEx } from "@/generic/input/extensions/HorizontalRuleEx";
import { useState } from "react";

export default function Page() {
  const { user } = useUser();
  const { following } = useRegistry();
  const { data, isLoading } = useQuery({
    queryKey: ["following", "feed"],
    queryFn: () => following.getFollowing({ page: 1, pageSize: 50 }),
    enabled: !!user,
  });

  if (!user) {
    return <Alert severity="info">Sign in to see followed authors and updates.</Alert>;
  }

  if (isLoading) {
    return <Alert severity="info">Loading your following feed…</Alert>;
  }

  const authors = data?.authors ?? [];
  const updates = data?.updates ?? [];

  return (
    <Stack gap={3}>
      <Typography variant="h4" component="h1" sx={{ my: 2 }}>Following</Typography>

      {/* Followed authors first, sorted by follow date (API returns desc by createdAt) */}
      <Stack gap={1}>
        <Typography variant="h6">Followed authors</Typography>
        {authors.length === 0 ? (
          <Alert severity="info">You are not following any authors yet.</Alert>
        ) : (
          <Grid container spacing={2}>
            {authors.map((a) => (
              <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack border={1} borderColor="divider" borderRadius={2} p={2} gap={1}>
                  <Typography variant="h6">{a.name}</Typography>
                  <Stack direction="row" gap={1}>
                    <Button LinkComponent={Link} href={`/authors/${a.id}`} variant="outlined" size="small">View</Button>
                  </Stack>
                </Stack>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <Stack gap={1}>
        <Typography variant="h6">Recent updates</Typography>
        {updates.length === 0 ? (
          <Alert severity="info">No recent updates from followed authors.</Alert>
        ) : (
          <Stack gap={2}>
            {updates.map((u) => (
              <FollowingUpdateRow key={u.id} update={u} />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function FollowingUpdateRow({ update: u }: { update: { id: string; title: string; contentRich?: unknown | null; createdAt: string; novel: { id: string; title: string }; author: { id: string; name: string } } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack border={1} borderColor="divider" borderRadius={2} p={2} gap={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {u.author.name} • {u.novel.title} • {new Date(u.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
      </Typography>
      <Typography variant="h6">{u.title}</Typography>
      <Collapse in={expanded} unmountOnExit>
        <UpdateContent value={u.contentRich} />
      </Collapse>
      <Stack direction="row" gap={1}>
        <Button variant="contained" size="small" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide details" : "View details"}
        </Button>
        <Button LinkComponent={Link} href={`/novels/${u.novel.id}`} variant="outlined" size="small">View novel</Button>
      </Stack>
    </Stack>
  );
}

function UpdateContent({ value }: { value?: unknown | null }) {
  try {
    if (!value) return null;
    const html = generateHTML(value as never, [
      StarterKit.configure({ heading: { levels: [2,3,4] } }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRuleEx,
      Underline,
      TiptapLink.configure({ protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ]);
    return <SanitizedHtml html={html} />;
  } catch {
    return null;
  }
}


