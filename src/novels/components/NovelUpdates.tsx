"use client";

import { Box, Button, Collapse, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useNovel } from "../providers";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { MAX_UPDATE_TITLE_LENGTH, NovelUpdateItem } from "@/contracts/novels";
import { RichTextEditor } from "@/generic/input/RichTextEditor";
import { toast } from "react-toastify";
import { Trash2 as TrashIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from "lucide-react";
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

export function NovelUpdates() {
  const { novel, canEdit } = useNovel();
  const { novels } = useRegistry();
  const client = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState<unknown | undefined>(undefined);

  const listQuery = useQuery({
    queryKey: ["novelUpdates", novel?.id, showAll ? "all" : "limited"],
    queryFn: () => novels.getUpdates(novel!.id, { limit: showAll ? 1000 : 3 }),
    enabled: !!novel,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!novel) return;
      const title = newTitle.trim();
      if (!title) {
        toast.error("Title is required");
        return;
      }
      if (title.length > MAX_UPDATE_TITLE_LENGTH) {
        toast.error(`Title cannot exceed ${MAX_UPDATE_TITLE_LENGTH} characters`);
        return;
      }
      await novels.createUpdate(novel.id, { title, contentRich: newContent });
    },
    onSuccess: () => {
      setNewTitle("");
      setNewContent(undefined);
      toast.success("Update posted");
      client.invalidateQueries({ queryKey: ["novelUpdates", novel?.id] });
    },
    onError: () => toast.error("Failed to post update"),
  });

  const del = useMutation({
    mutationFn: async (updateId: string) => {
      if (!novel) return;
      await novels.deleteUpdate(novel.id, updateId);
    },
    onSuccess: () => {
      toast.success("Update deleted");
      client.invalidateQueries({ queryKey: ["novelUpdates", novel?.id] });
    },
    onError: () => toast.error("Failed to delete update"),
  });

  const updates = listQuery.data ?? [];

  return (
    <Stack gap={2}>
      <Typography variant="h5">Updates</Typography>

      {canEdit && (
        <Stack gap={1} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
          <TextField
            size="small"
            label={`Title (${newTitle.length}/${MAX_UPDATE_TITLE_LENGTH})`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value.slice(0, MAX_UPDATE_TITLE_LENGTH))}
            placeholder="Short title (max 50 chars)"
          />
          <RichTextEditor
            value={newContent}
            onChange={(json) => setNewContent(json)}
            placeholder="Write the update details..."
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending}>
              Post update
            </Button>
          </Box>
        </Stack>
      )}

      <Stack gap={1.5}>
        {updates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No updates yet.</Typography>
        ) : (
          updates.map((u) => (
            <UpdateItem
              key={u.id}
              item={u}
              canEdit={!!canEdit}
              onDelete={() => del.mutate(u.id)}
            />
          ))
        )}
      </Stack>

      {updates.length >= 3 && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            size="small"
            onClick={() => setShowAll((v) => !v)}
            endIcon={showAll ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          >
            {showAll ? "Show fewer updates" : "Show all updates"}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

function UpdateItem({ item, canEdit, onDelete }: { item: NovelUpdateItem; canEdit: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const html = useMemo(() => toHtml(item.contentRich), [item.contentRich]);
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{item.title}</Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Button size="small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "Details"}
          </Button>
          {canEdit && (
            <IconButton size="small" onClick={onDelete} aria-label="Delete update">
              <TrashIcon size={16} />
            </IconButton>
          )}
        </Stack>
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ mt: 1 }}>
          {html ? (
            <SanitizedHtml html={html} />
          ) : (
            <Typography variant="body2" color="text.secondary">No description.</Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function toHtml(json: unknown): string {
  try {
    if (!json) return "";
    return generateHTML(json as never, [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRuleEx,
      Underline,
      TiptapLink.configure({ protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ]);
  } catch {
    return "";
  }
}


