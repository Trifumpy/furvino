"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { FontSize } from "./extensions/FontSize";
import { Box, IconButton, Stack, Typography, Popover, TextField } from "@mui/material";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough as StrikeIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Palette as PaletteIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { toast } from "react-toastify";
import { MAX_DESCRIPTION_LENGTH } from "@/contracts/novels";


type Props = {
  value?: unknown;
  onChange?: (doc: unknown, html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function RichTextEditor({ value, onChange, placeholder, disabled }: Props) {
  const MAX = MAX_DESCRIPTION_LENGTH;
  const lastValidDoc = useRef<unknown | null>(value ?? null);
  const isInternalUpdate = useRef(false);
  const externalValueKey = useMemo(() => {
    try {
      return JSON.stringify(value ?? null);
    } catch {
      return String(value ?? "null");
    }
  }, [value]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https"] }),
      Placeholder.configure({ placeholder: placeholder || "Write a description..." }),
    ],
    editable: !disabled,
    content: value as never,
    onUpdate({ editor }) {
      const textLength = editor.getText().length;
      if (textLength > MAX) {
        if (lastValidDoc.current) {
          editor.commands.setContent(lastValidDoc.current as never, { emitUpdate: false });
        } else {
          editor.commands.clearContent(true);
        }
        toast.error(`Description cannot exceed ${MAX} characters.`);
        return;
      }

      const json = editor.getJSON();
      const html = editor.getHTML();
      lastValidDoc.current = json;
      isInternalUpdate.current = true;
      onChange?.(json, html);
      queueMicrotask(() => {
        isInternalUpdate.current = false;
      });
    },
    // Avoid SSR hydration mismatches per TipTap guidance
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) return;

    // Only update editor when external value truly changed
    const currentKey = (() => {
      try { return JSON.stringify(editor.getJSON()); } catch { return ""; }
    })();
    if (externalValueKey === currentKey) return;

    const { from, to } = editor.state.selection;
    if (value) {
      editor.commands.setContent(value as never, { emitUpdate: false });
      editor.commands.setTextSelection({ from, to });
    } else {
      editor.commands.clearContent(true);
    }
  }, [externalValueKey, value, editor]);

  // Color picker state (must be declared before any early returns)
  const [pickerAnchor, setPickerAnchor] = useState<HTMLButtonElement | null>(null);
  if (!editor) return null;

  const currentColor: string = (editor.getAttributes('textStyle')?.color as string) || '#111827';

  return (
    <Stack gap={1} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1, outline: 'none',
      '&:focus-within': { outline: 'none', boxShadow: 'none' },
      '& .ProseMirror:focus, & .ProseMirror:focus-visible': { outline: 'none' },
      '& .ProseMirror': { minHeight: 160 }
    }}>
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: 'center' }}>
        {/* Font size controls */}
        <Box sx={{ display: 'flex', gap: 0.25, mr: 1 }}>
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); setFontSize(editor, '0.9rem'); }} aria-label="Small text">
            <span style={{ fontSize: 12 }}>A-</span>
          </IconButton>
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); setFontSize(editor, null); }} aria-label="Normal text">
            <span style={{ fontSize: 14 }}>A</span>
          </IconButton>
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); setFontSize(editor, '2rem'); }} aria-label="Large text">
            <span style={{ fontSize: 16 }}>A+</span>
          </IconButton>
        </Box>
        <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} disabled={!editor.can().chain().focus().toggleBold().run()} aria-label="Bold">
          <BoldIcon size={16} />
        </IconButton>
        <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} disabled={!editor.can().chain().focus().toggleItalic().run()} aria-label="Italic">
          <ItalicIcon size={16} />
        </IconButton>
        <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} disabled={!editor.can().chain().focus().toggleStrike().run()} aria-label="Strikethrough">
          <StrikeIcon size={16} />
        </IconButton>
        <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} disabled={!editor.can().chain().focus().toggleUnderline().run()} aria-label="Underline">
          <UnderlineIcon size={16} />
        </IconButton>
        <IconButton size="small" onMouseDown={(e) => {
          e.preventDefault();
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('URL', previousUrl);
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
        }} aria-label="Link">
          <LinkIcon size={16} />
        </IconButton>
        {/* Color picker popover trigger */}
        <IconButton
          size="small"
          onMouseDown={(e) => { e.preventDefault(); setPickerAnchor(e.currentTarget); }}
          aria-label="Color picker"
        >
          <PaletteIcon size={16} />
        </IconButton>
        <Popover
          open={!!pickerAnchor}
          anchorEl={pickerAnchor}
          onClose={() => setPickerAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => { editor.chain().focus().setColor(e.target.value).run(); }}
              style={{ width: 36, height: 24, border: 'none', background: 'transparent', padding: 0 }}
            />
            <TextField
              size="small"
              label="Hex"
              value={currentColor}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(v)) {
                  editor.chain().focus().setColor(v).run();
                }
              }}
              sx={{ width: 100 }}
            />
            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }} aria-label="Clear color">
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
            </IconButton>
          </Box>
        </Popover>
        {/* Color palette */}
        <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
          {COLOR_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(hex).run(); }}
              title={hex}
              style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #ccc', background: hex, cursor: 'pointer' }}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }}
            title="Clear color"
            style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}
          />
        </Box>
      </Box>
      <EditorContent editor={editor} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="caption" color={editor.getText().length > MAX ? 'error' : 'text.secondary'}>
          {editor.getText().length}/{MAX}
        </Typography>
      </Box>
    </Stack>
  );
}

const COLOR_PALETTE = [
  // Neutrals
  '#111827', '#374151', '#6b7280', '#9ca3af',
  // Reds / Oranges / Yellows
  '#ef4444', '#dc2626', '#f97316', '#ea580c', '#f59e0b', '#eab308',
  // Greens
  '#84cc16', '#22c55e', '#16a34a',
  // Teals / Cyans
  '#0ea5a9', '#06b6d4',
  // Blues / Indigo
  '#3b82f6', '#2563eb', '#4f46e5',
  // Purples / Pinks / Rose
  '#8b5cf6', '#7c3aed', '#ec4899', '#db2777', '#f43f5e',
];

function setFontSize(editor: TiptapEditor | null, size: string | null) {
  if (!editor) return;
  if (size) {
    const attrs: Record<string, unknown> = { fontSize: size };
    editor.chain().focus().setMark('textStyle', attrs).run();
  } else {
    // Explicitly remove fontSize by unsetting textStyle and re-applying preserved attrs
    const attrs = (editor.getAttributes('textStyle') || {}) as Record<string, unknown>;
    const preserved: Record<string, unknown> = {};
    if (typeof attrs.color === 'string') preserved.color = attrs.color;
    editor.chain().focus().unsetMark('textStyle').run();
    if (Object.keys(preserved).length > 0) {
      editor.chain().focus().setMark('textStyle', preserved).run();
    }
  }
}


