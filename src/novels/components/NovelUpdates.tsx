"use client";

import { Box, Button, Collapse, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useNovel } from "../providers/ClientNovelProvider";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegistry } from "@/utils/client";
import { MAX_UPDATE_TITLE_LENGTH, NovelUpdateItem } from "@/contracts/novels";
import { RichTextEditor } from "@/generic/input/RichTextEditor";
import { toast } from "react-toastify";
import { Trash2 as TrashIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, History as HistoryIcon } from "lucide-react";
import { SanitizedHtml } from "@/generic/display";
import { formatDateTimeUtcShort } from "@/utils/lib/dates";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize } from "@/generic/input/extensions/FontSize";
import { HorizontalRuleEx } from "@/generic/input/extensions/HorizontalRuleEx";
import { getNovelColors } from "@/utils/lib/colors";

export function NovelUpdates() {
  const { novel, canEdit } = useNovel();
  const { novels } = useRegistry();
  const client = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState<unknown | undefined>(undefined);
  // Site design colors for buttons and text
  const { buttonBgColorHex, buttonTextColorHex, foregroundTextColorHex } = getNovelColors(novel);

  const listQuery = useQuery({
    queryKey: ["novelUpdates", novel?.id],
    queryFn: () => novels.getUpdates(novel!.id, { limit: 1000 }),
    enabled: !!novel,
    staleTime: 60_000,
  });
  const readQuery = useQuery({
    queryKey: ["novelUpdatesRead", novel?.id],
    queryFn: async () => {
      // Fetch read states for current user by asking server via following API-like path per update
      // Since there is no batch API yet, we derive read state client-side using a minimal head request
      // For now, leave empty array; isRead will be handled via item-level fetch below if needed
      return [] as string[];
    },
    enabled: !!novel,
    staleTime: 30_000,
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

  const updates = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const firstThree = useMemo(() => updates.slice(0, 3), [updates]);
  const restUpdates = useMemo(() => updates.slice(3), [updates]);

  return (
    <Stack gap={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon size={20} />
        Novel Updates
      </Typography>

      {canEdit && (
        <Stack gap={1} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
          <TextField
            size="small"
            label={`Title (${newTitle.length}/${MAX_UPDATE_TITLE_LENGTH})`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value.slice(0, MAX_UPDATE_TITLE_LENGTH))}
            placeholder="Short title (max 50 chars)"
          />
          <Box sx={{ color: 'text.primary' }}>
            <RichTextEditor
              value={newContent}
              onChange={(json) => setNewContent(json)}
              placeholder="Write the update details..."
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={() => create.mutate()}
              disabled={create.isPending}
              sx={{ bgcolor: buttonBgColorHex, color: buttonTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
            >
              Post update
            </Button>
          </Box>
        </Stack>
      )}

      <Stack gap={1.5}>
        {updates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No updates yet.</Typography>
        ) : (
          <>
            {firstThree.map((u) => (
              <UpdateItem
                key={u.id}
                item={u}
                canEdit={!!canEdit}
                onDelete={() => del.mutate(u.id)}
                buttonBgColorHex={buttonBgColorHex}
                buttonTextColorHex={buttonTextColorHex}
                foregroundTextColorHex={foregroundTextColorHex}
                novelId={novel!.id}
              />
            ))}
            <Collapse in={showAll} unmountOnExit>
              <Stack gap={1.5} sx={{ mt: 1.5 }}>
                {restUpdates.map((u) => (
                  <UpdateItem
                    key={u.id}
                    item={u}
                    canEdit={!!canEdit}
                    onDelete={() => del.mutate(u.id)}
                    buttonBgColorHex={buttonBgColorHex}
                    buttonTextColorHex={buttonTextColorHex}
                    foregroundTextColorHex={foregroundTextColorHex}
                    novelId={novel!.id}
                  />
                ))}
              </Stack>
            </Collapse>
          </>
        )}
      </Stack>

      {updates.length > 3 && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => setShowAll((v) => !v)}
            endIcon={showAll ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
            sx={{ bgcolor: buttonBgColorHex, color: buttonTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
          >
            {showAll ? "Show fewer updates" : "Show all updates"}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

function UpdateItem({ item, canEdit, onDelete, buttonBgColorHex, buttonTextColorHex, foregroundTextColorHex, novelId }: { item: NovelUpdateItem; canEdit: boolean; onDelete: () => void; buttonBgColorHex: string; buttonTextColorHex: string; foregroundTextColorHex: string; novelId: string }) {
  const [expanded, setExpanded] = useState(false);
  const html = useMemo(() => toHtml(item.contentRich), [item.contentRich]);
  const { novels } = useRegistry();
  const client = useQueryClient();
  const readKey = ["novelUpdateRead", item.id];
  const { data: isRead } = useQuery({
    queryKey: readKey,
    queryFn: async () => {
      // Probe read status via following feed isn't available; default false
      return false as boolean;
    },
    staleTime: 15_000,
  });
  const markRead = useMutation({
    mutationFn: () => novels.post<{ ok: true }, never>(`/${novelId}/updates/${item.id}/read`, undefined as never),
    onSuccess: () => client.setQueryData(readKey, true),
  });
  const markUnread = useMutation({
    mutationFn: () => novels.delete<{ ok: true }>(`/${novelId}/updates/${item.id}/read`),
    onSuccess: () => client.setQueryData(readKey, false),
  });
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{item.title}</Typography>
          <Typography variant="caption" sx={{ color: foregroundTextColorHex }}>{formatDateTimeUtcShort(item.createdAt)}</Typography>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Button
            size="small"
            variant={isRead ? "outlined" : "contained"}
            onClick={() => (isRead ? markUnread.mutate() : markRead.mutate())}
            sx={{ bgcolor: isRead ? undefined : buttonBgColorHex, color: isRead ? undefined : buttonTextColorHex, '&:hover': { bgcolor: isRead ? undefined : buttonBgColorHex } }}
          >
            {isRead ? "Mark unread" : "Mark read"}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setExpanded((v) => !v)}
            sx={{ bgcolor: buttonBgColorHex, color: buttonTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
          >
            {expanded ? "Hide" : "Details"}
          </Button>
          {canEdit && (
            <IconButton
              size="small"
              onClick={() => {
                if (window.confirm("Delete this update? This cannot be undone.")) {
                  onDelete();
                }
              }}
              aria-label="Delete update"
              sx={{ bgcolor: buttonBgColorHex, color: buttonTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
            >
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
    let html = generateHTML(json as never, [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRuleEx,
      Underline,
      TiptapLink.configure({ protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ]);
    try {
      const hrStyles: { thickness: number; color: string }[] = [];
      collectHrStyles(json as never, hrStyles);
      if (hrStyles.length > 0) {
        let idx = 0;
        html = html.replace(/<hr\b[^>]*>/g, (match) => {
          const s = hrStyles[idx++];
          if (!s) return match;
          const style = `border: none; border-top: ${Math.max(1, s.thickness || 1)}px solid ${s.color || '#9ca3af'}; margin: 12px 0;`;
          const withoutStyle = match.replace(/\sstyle="[^"]*"/i, "");
          return withoutStyle.replace(/<hr/, `<hr style="${style}"`);
        });
      }
    } catch {}
    return html;
  } catch {
    return "";
  }
}

type PMNode = {
  type?: string;
  attrs?: { thickness?: unknown; color?: unknown };
  content?: unknown[];
};

function collectHrStyles(node: unknown, out: { thickness: number; color: string }[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) collectHrStyles(n, out);
    return;
  }
  if (typeof node === 'object') {
    const n = node as PMNode;
    if (n.type === 'horizontalRule') {
      const t = Number(n.attrs?.thickness) || 1;
      const c = typeof n.attrs?.color === 'string' ? (n.attrs?.color as string) : '#9ca3af';
      out.push({ thickness: t, color: c });
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) collectHrStyles(child, out);
    }
  }
}


