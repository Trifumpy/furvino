"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize } from "./extensions/FontSize";
import { HorizontalRuleEx } from "./extensions/HorizontalRuleEx";
import { Box, IconButton, Stack, Typography, Popover, TextField, Button } from "@mui/material";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough as StrikeIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Palette as PaletteIcon,
  Minus as MinusIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRuleEx,
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
  // Divider popover state
  const [hrAnchor, setHrAnchor] = useState<HTMLButtonElement | null>(null);
  const [hrThickness, setHrThickness] = useState<number>(1);
  const [hrColor, setHrColor] = useState<string>((() => {
    const initial = (typeof window !== 'undefined') ? '#111827' : '#111827';
    return initial;
  })());

  const currentColor: string = (editor?.getAttributes('textStyle')?.color as string) || '#111827';
  useEffect(() => {
    setHrColor((prev) => prev || currentColor);
  }, [currentColor]);

  if (!editor) return null;

  const replaceOrInsertHr = (attrs: { thickness: number; color: string }) => {
    if (!editor) return;
    const { state } = editor;
    const $from = state.selection.$from;
    let pos: number | null = null;
    const before = $from.nodeBefore as unknown as { type?: { name?: string }; nodeSize?: number } | null;
    if (before && before.type && before.type.name === 'horizontalRule' && typeof before.nodeSize === 'number') {
      pos = $from.pos - before.nodeSize;
    } else {
      const after = $from.nodeAfter as unknown as { type?: { name?: string } } | null;
      if (after && after.type && after.type.name === 'horizontalRule') {
        pos = $from.pos;
      }
    }
    const chain = editor.chain().focus();
    if (pos !== null) {
      chain.setNodeSelection(pos).deleteSelection().insertContentAt(pos, { type: 'horizontalRule', attrs }).run();
    } else {
      chain.insertContent({ type: 'horizontalRule', attrs }).run();
    }
  };

  const updateNearestHr = (attrs: { thickness: number; color: string }) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const $from = state.selection.$from;
        const schema = state.schema;
        const before = $from.nodeBefore as unknown as { type?: { name?: string }; nodeSize?: number } | null;
        const after = $from.nodeAfter as unknown as { type?: { name?: string } } | null;
        let pos: number | null = null;
        if (before && before.type && before.type.name === 'horizontalRule' && typeof before.nodeSize === 'number') {
          pos = $from.pos - before.nodeSize;
        } else if (after && after.type && after.type.name === 'horizontalRule') {
          pos = $from.pos;
        }
        if (pos === null) return false;
        tr.setNodeMarkup(pos, schema.nodes.horizontalRule, attrs as never);
        return true;
      })
      .run();
  };

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
        <IconButton
          size="small"
          onMouseDown={(e) => {
            e.preventDefault();
            // Insert a default divider first, then open the popover to adjust
            replaceOrInsertHr({ thickness: 1, color: currentColor });
            setHrThickness(1);
            setHrColor(currentColor);
            setHrAnchor(e.currentTarget);
          }}
          aria-label="Divider options"
          title="Insert divider or adjust style"
        >
          <MinusIcon size={16} />
        </IconButton>
        <Popover
          open={!!hrAnchor}
          anchorEl={hrAnchor}
          onClose={() => setHrAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Thickness</Typography>
            <TextField
              size="small"
              type="number"
              value={hrThickness}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0 && v <= 12) setHrThickness(v);
              }}
              inputProps={{ min: 1, max: 12, step: 1 }}
              sx={{ width: 80 }}
            />
            <Typography variant="caption" color="text.secondary">Color</Typography>
            <input
              type="color"
              value={hrColor}
              onChange={(e) => setHrColor(e.target.value)}
              style={{ width: 36, height: 24, border: 'none', background: 'transparent', padding: 0 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                const colorToUse = hrColor || currentColor;
                updateNearestHr({ thickness: hrThickness, color: colorToUse });
                setHrAnchor(null);
              }}
            >
              Save
            </Button>
          </Box>
        </Popover>
        
        <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
          <IconButton
            size="small"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
            aria-label="Align left"
          >
            <AlignLeftIcon size={16} />
          </IconButton>
          <IconButton
            size="small"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
            aria-label="Align center"
          >
            <AlignCenterIcon size={16} />
          </IconButton>
          <IconButton
            size="small"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
            aria-label="Align right"
          >
            <AlignRightIcon size={16} />
          </IconButton>
        </Box>
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
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                sx={{ width: 120 }}
              />
              <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }} aria-label="Clear color">
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
              </IconButton>
            </Box>
            {/* Screen pick removed per request */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(11, 18px)', gap: 0.5 }}>
              {COLOR_PALETTE.map((hex) => {
                const isSelected = (currentColor || '').toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(hex).run(); }}
                    title={hex}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #fff' : '1px solid #ccc',
                      outline: isSelected ? '2px solid rgba(0,0,0,0.6)' : 'none',
                      background: hex,
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }}
                title="Clear color"
                style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}
              />
            </Box>
          </Box>
        </Popover>
        
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
  // Neutrals (include pure black and white)
  '#000000', '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
  // Reds
  '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171',
  // Oranges
  '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c',
  // Ambers
  '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24',
  // Yellows
  '#713f12', '#854d0e', '#a16207', '#ca8a04', '#eab308', '#fde047',
  // Limes
  '#365314', '#3f6212', '#4d7c0f', '#65a30d', '#84cc16', '#a3e635',
  // Greens
  '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80',
  // Emeralds
  '#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399',
  // Teals
  '#134e4a', '#115e59', '#0f766e', '#0ea5a9', '#14b8a6', '#2dd4bf',
  // Cyans
  '#164e63', '#155e75', '#0e7490', '#06b6d4', '#22d3ee', '#67e8f9',
  // Skies
  '#0c4a6e', '#075985', '#0369a1', '#0284c7', '#38bdf8', '#7dd3fc',
  // Blues
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  // Indigos
  '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8',
  // Violets
  '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa',
  // Purples
  '#581c87', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc',
  // Fuchsias
  '#701a75', '#86198f', '#a21caf', '#c026d3', '#d946ef', '#e879f9',
  // Pinks
  '#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6',
  // Roses
  '#881337', '#9f1239', '#be123c', '#e11d48', '#f43f5e', '#fb7185',
];

// Screen picking feature removed per request

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


