"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Divider, IconButton, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Tooltip, Chip } from "@mui/material";
import { useNovel } from "@/novels/providers/ClientNovelProvider";
import { useUpdateNovelLayout } from "@/novels/hooks";
import { galleryBlockSchema, imageBlockSchema, layoutBlockSchema, NovelLayout, richTextBlockSchema } from "@/contracts/novels";
import { Trash2Icon, MoveUpIcon, MoveDownIcon, SaveIcon, GripVerticalIcon, XIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "react-toastify";
import { SafeImage } from "@/generic/display";
import { RichTextEditor } from "@/generic/input";
import { Rnd } from "react-rnd";

type EditorBlock = z.infer<typeof layoutBlockSchema>;
const EDITOR_HIDDEN_TYPES: ReadonlyArray<EditorBlock["type"]> = [
  "updates",
  "ratings",
  "ratingsList",
  "comments",
  "gallery",
];

// Make resize handles flush with edges and easier to grab
const HANDLE_THICKNESS = 12; // px
const CORNER_SIZE = 16; // px
const RESIZE_HANDLE_STYLES = {
  top: {
    height: `${HANDLE_THICKNESS}px`,
    top: 0,
    left: 0,
    right: 0,
    cursor: "ns-resize",
    zIndex: 3,
  },
  right: {
    width: `${HANDLE_THICKNESS}px`,
    right: 0,
    top: 0,
    bottom: 0,
    cursor: "ew-resize",
    zIndex: 3,
  },
  bottom: {
    height: `${HANDLE_THICKNESS}px`,
    bottom: 0,
    left: 0,
    right: 0,
    cursor: "ns-resize",
    zIndex: 3,
  },
  left: {
    width: `${HANDLE_THICKNESS}px`,
    left: 0,
    top: 0,
    bottom: 0,
    cursor: "ew-resize",
    zIndex: 3,
  },
  topLeft: {
    width: `${CORNER_SIZE}px`,
    height: `${CORNER_SIZE}px`,
    top: 0,
    left: 0,
    cursor: "nwse-resize",
    zIndex: 3,
  },
  topRight: {
    width: `${CORNER_SIZE}px`,
    height: `${CORNER_SIZE}px`,
    top: 0,
    right: 0,
    cursor: "nesw-resize",
    zIndex: 3,
  },
  bottomRight: {
    width: `${CORNER_SIZE}px`,
    height: `${CORNER_SIZE}px`,
    bottom: 0,
    right: 0,
    cursor: "nwse-resize",
    zIndex: 3,
  },
  bottomLeft: {
    width: `${CORNER_SIZE}px`,
    height: `${CORNER_SIZE}px`,
    bottom: 0,
    left: 0,
    cursor: "nesw-resize",
    zIndex: 3,
  },
} as const;

function filterEditableBlocks(input: EditorBlock[]): EditorBlock[] {
  return input.filter((b) => !EDITOR_HIDDEN_TYPES.includes(b.type));
}

export function PageLayoutEditor() {
  const { novel, canEdit } = useNovel();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const CANVAS_CONTENT_WIDTH = 1152; // matches details page content area (maxWidth 1200 - px(3)*2)
  const [imageAspectById, setImageAspectById] = useState<Record<string, number>>({});
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    const existing = (novel as unknown as { pageLayout?: NovelLayout | null }).pageLayout;
    // If a layout already exists, even if empty, do NOT inject defaults
    if (existing && Array.isArray(existing.blocks)) {
      return assignFrames(filterEditableBlocks(existing.blocks as EditorBlock[]), CANVAS_CONTENT_WIDTH);
    }
    // No existing layout: seed with a details-synced rich text block if details/snippet exist
    const defaultBlocks: EditorBlock[] = [];
    const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
    const snippet = (novel as unknown as { snippet?: string | null }).snippet ?? null;
    if (rich || (typeof snippet === 'string' && snippet.trim().length > 0)) {
      defaultBlocks.push({ type: "richText", content: { source: 'details' } } as unknown as EditorBlock);
    }
    return assignFrames(defaultBlocks, CANVAS_CONTENT_WIDTH);
  });
  const { updateLayout, isUpdatingLayout } = useUpdateNovelLayout(novel!.id);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerSelected, setImagePickerSelected] = useState<string | null>(null);
  const [hideThumbnail, setHideThumbnail] = useState<boolean>(
    !!((novel as unknown as { pageLayout?: { settings?: { hideThumbnail?: boolean } } | null }).pageLayout?.settings?.hideThumbnail)
  );
  const [hideTags, setHideTags] = useState<boolean>(
    !!((novel as unknown as { pageLayout?: { settings?: { hideTags?: boolean } } | null }).pageLayout?.settings?.hideTags)
  );
  const [hiddenGalleryItemIds, setHiddenGalleryItemIds] = useState<string[]>(
    Array.isArray(((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds))
      ? ((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds as string[])
      : []
  );
  const [compactGallery, setCompactGallery] = useState<boolean>(
    !!((novel as unknown as { pageLayout?: { settings?: { compactGallery?: boolean } } | null }).pageLayout?.settings?.compactGallery)
  );

  const [canvasWidth, setCanvasWidth] = useState<number>(CANVAS_CONTENT_WIDTH);
  useEffect(() => {
    const update = () => setCanvasWidth(canvasRef.current?.clientWidth ?? CANVAS_CONTENT_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Keep image blocks' frames matched to their image aspect ratio to avoid letterboxing
  useEffect(() => {
    setBlocks((prev) => {
      let changed = false;
      const next = prev.map((blk) => {
        if ((blk as { type: string }).type !== 'image') return blk;
        const id = (blk as { type: 'image'; id?: string }).id;
        const ar = id ? imageAspectById[id] : undefined;
        const f = (blk as { frame?: { x: number; y: number; width: number; height: number } }).frame;
        if (!ar || !f) return blk;
        const currentWidth = Math.max(1, f.width || 1);
        const expectedHeight = Math.max(60, Math.round(currentWidth / ar));
        if (Math.abs((f.height || 0) - expectedHeight) > 1) {
          changed = true;
          return { ...(blk as EditorBlock), frame: { ...f, height: expectedHeight } } as EditorBlock;
        }
        return blk;
      });
      return changed ? next : prev;
    });
  }, [imageAspectById]);

  // Gallery blocks are not supported in the editor; no size enforcement

  if (!novel || !canEdit) return null;

  const addBlock = (type: EditorBlock["type"]) => {
    switch (type) {
      case "richText":
        setBlocks((b) => stackAtEnd(b, { type, content: { type: "doc", content: [{ type: "paragraph" }] } } as EditorBlock, canvasWidth));
        break;
      case "gallery":
        // Gallery is managed automatically on the novel page; it is not available in the editor
        break;
      case "image":
        if ((novel.galleryItems ?? []).length === 0) {
          toast.error("No gallery images available");
          return;
        }
        setImagePickerSelected(null);
        setImagePickerOpen(true);
        break;
      case "spacer":
        setBlocks((b) => stackAtEnd(b, { type } as EditorBlock, canvasWidth));
        break;
      default:
        break;
    }
  };

  const addRichTextWithDetails = () => {
    setBlocks((b) => stackAtEnd(b, { type: "richText", content: { source: 'details' } } as unknown as EditorBlock, canvasWidth));
  };

  // Auto-populate gallery blocks without items so they preview novel's gallery
  useEffect(() => {
    if (!novel) return;
    const allIds = (novel.galleryItems ?? []).map((g) => g.id);
    if (allIds.length === 0) return;
    setBlocks((prev) => {
      let changed = false;
      const next = prev.map((blk) => {
        if ((blk as { type: string }).type !== 'gallery') return blk;
        const items = (blk as { type: 'gallery'; items?: string[] }).items;
        if (!items || items.length === 0) {
          changed = true;
          return { ...(blk as EditorBlock), items: allIds } as EditorBlock;
        }
        return blk;
      });
      return changed ? next : prev;
    });
  }, [novel, novel?.galleryItems?.length]);

  const insertImageWithInitialFrame = (imageId: string) => {
    setBlocks((prev) => {
      // Ensure existing blocks have frames and compute stacking Y
      const arranged = assignFrames([...prev], canvasWidth);
      const maxY = arranged.reduce((acc, b) => Math.max(acc, ((b as { frame?: { y?: number; height?: number } }).frame?.y ?? 0) + ((b as { frame?: { height?: number } }).frame?.height ?? 0)), 0);
      const cw = canvasRef.current?.clientWidth ?? CANVAS_CONTENT_WIDTH;
      const sidePadding = 20;
      const w = Math.min(360, Math.max(80, cw - sidePadding * 2));
      const ar = imageAspectById[imageId];
      const h = ar && ar > 0 ? Math.max(60, Math.round(w / ar)) : 240;
      const proposed = { x: sidePadding, y: maxY + 20, width: w, height: h };
      const adjusted = adjustForProtectedOverlap(proposed, arranged, false);
      return [...arranged, { type: "image", id: imageId, frame: adjusted } as EditorBlock];
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    setBlocks((b) => {
      const next = [...b];
      const j = index + dir;
      if (j < 0 || j >= next.length) return next;
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const remove = (index: number) => {
    setBlocks((b) => b.filter((_, i) => i !== index));
  };

  const save = async () => {
    try {
      // Validate before send
      const toSave = filterEditableBlocks(blocks);
      const fullIds = (novel.galleryItems ?? []).map((g) => g.id).filter((id) => !hiddenGalleryItemIds.includes(id));
      const normalized: EditorBlock[] = toSave.map((blk) => {
        if ((blk as { type: string }).type !== 'gallery') return blk;
        const items = ((blk as unknown as { items?: string[] }).items) as string[] | undefined;
        const frameRaw = (blk as unknown as { frame?: { x: number; y: number; width: number; height: number } }).frame;
        const frame = frameRaw ? { x: Math.round(frameRaw.x), y: Math.round(frameRaw.y), width: Math.round(frameRaw.width), height: Math.round(frameRaw.height) } : undefined;
        if (Array.isArray(items) && items.length === fullIds.length && items.every((id, idx) => id === fullIds[idx])) {
          // Strip items to render default gallery on novel page
          return ({ type: 'gallery', ...(frame ? { frame } : {}) } as unknown) as EditorBlock;
        }
        return ({ ...(blk as EditorBlock), ...(frame ? { frame } : {}) } as EditorBlock);
      });
      // Ensure all frames are ints
      const ints = normalized.map((blk) => {
        const f = (blk as unknown as { frame?: { x: number; y: number; width: number; height: number } }).frame;
        return f ? ({ ...(blk as EditorBlock), frame: { x: Math.round(f.x), y: Math.round(f.y), width: Math.round(f.width), height: Math.round(f.height) } } as EditorBlock) : blk;
      });
      const layout: NovelLayout = { version: 1, blocks: layoutBlockSchema.array().parse(ints), settings: { hideThumbnail, hideTags, hiddenGalleryItemIds, compactGallery } } as NovelLayout;
      await updateLayout(layout);
      toast.success("Layout saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const revertToDefaults = async () => {
    if (!window.confirm("Revert to site defaults? Your saved layout will be overwritten.")) return;
      const defaults = (() => {
      const arr: EditorBlock[] = [];
      const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
      const snippet = (novel as unknown as { snippet?: string | null }).snippet ?? null;
      if (rich) arr.push({ type: "richText", content: rich } as EditorBlock);
      else if (typeof snippet === 'string' && snippet.trim().length > 0) arr.push({ type: "richText", content: snippetToDoc(snippet) } as EditorBlock);
        // No gallery block in editor defaults
        return assignFrames(arr, CANVAS_CONTENT_WIDTH);
    })();
    setBlocks(defaults);
    setHideThumbnail(false);
    setHideTags(false);
    setHiddenGalleryItemIds([]);
    setCompactGallery(false);
    try {
      // Reset settings to default (show thumbnail)
      const layout: NovelLayout = { version: 1, blocks: layoutBlockSchema.array().parse(defaults), settings: { hideThumbnail: false } } as NovelLayout;
      await updateLayout(layout);
      toast.success("Layout reset to defaults");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Stack gap={2} mt={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1}>
        <Typography variant="h5">Page layout</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <FormControlLabel
            control={<Switch checked={hideThumbnail} onChange={(e) => setHideThumbnail(e.target.checked)} />}
            label="Hide thumbnail on novel page"
          />
          <FormControlLabel
            control={<Switch checked={hideTags} onChange={(e) => setHideTags(e.target.checked)} />}
            label="Hide tags on novel page"
          />
          <FormControlLabel
            control={<Switch checked={compactGallery} onChange={(e) => setCompactGallery(e.target.checked)} />}
            label="Compact gallery (single row with scroll)"
          />
        </Stack>
      </Stack>
      {/* Assets panel */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>Assets</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Gallery items</Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "1fr 1fr 1fr 1fr" },
              }}
            >
              {(novel.galleryItems ?? []).map((gi) => (
                <Box
                  key={gi.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/json", JSON.stringify({ kind: "asset-image", id: gi.id }));
                  }}
                  sx={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 1, overflow: "hidden", border: '1px solid', borderColor: hiddenGalleryItemIds.includes(gi.id) ? 'warning.main' : 'divider' }}
                  title="Drag into layout to add image block or into a gallery block"
                >
                  <SafeImage
                    src={gi.imageUrl}
                    alt={gi.footer ?? "Image"}
                    fill
                    sizes="(max-width: 600px) 50vw, 25vw"
                    onLoadingComplete={(img) => {
                      const ar = img.naturalWidth / Math.max(1, img.naturalHeight);
                      if (gi.id && ar > 0 && Number.isFinite(ar)) {
                        setImageAspectById((prev) => (prev[gi.id] === ar ? prev : { ...prev, [gi.id]: ar }));
                      }
                    }}
                    style={{ objectFit: "cover" }}
                  />
                  <Stack direction="row" gap={0.5} sx={{ position: 'absolute', bottom: 4, left: 4, right: 4, zIndex: 2 }}>
                    <Button size="small" variant="contained" color={hiddenGalleryItemIds.includes(gi.id) ? 'warning' : 'primary'} onClick={() => {
                      setHiddenGalleryItemIds((prev) => hiddenGalleryItemIds.includes(gi.id) ? prev.filter((x) => x !== gi.id) : [...prev, gi.id]);
                    }} sx={{ minHeight: 28, px: 1.5 }}>
                      {hiddenGalleryItemIds.includes(gi.id) ? 'Hidden' : 'Hide from gallery'}
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Box>
            {hiddenGalleryItemIds.length > 0 && (
              <Stack direction="row" alignItems="center" gap={1} mt={1} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">Hidden in gallery preview:</Typography>
                {hiddenGalleryItemIds.map((id) => {
                  const gi = (novel.galleryItems ?? []).find((x) => x.id === id);
                  if (!gi) return null;
                  return (
                    <Chip key={id} size="small" label={gi.footer || id} onDelete={() => setHiddenGalleryItemIds((prev) => prev.filter((x) => x !== id))} />
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button size="small" variant="outlined" onClick={() => addBlock("richText")}>Add rich text</Button>
        <Button size="small" variant="outlined" onClick={addRichTextWithDetails}>Add richText with details</Button>
        <Button size="small" variant="outlined" onClick={() => addBlock("image")}>Add single image</Button>
        <Button size="small" variant="outlined" onClick={() => addBlock("spacer")}>Add empty spacer</Button>
      </Stack>
      <Divider />
      <Typography variant="body2" color="text.secondary">
        This will only be visible to users in desktop mode
      </Typography>
      <Box
        ref={canvasRef}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          try {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data?.kind === "asset-image") {
              const rect = canvasRef.current?.getBoundingClientRect();
              const canvasLeft = rect?.left ?? 0;
              const canvasTop = rect?.top ?? 0;
              const cw = canvasRef.current?.clientWidth ?? CANVAS_CONTENT_WIDTH;
              const w = Math.min(360, cw);
              const knownAr = typeof data.id === 'string' ? imageAspectById[data.id] : undefined;
              const h = knownAr && knownAr > 0 ? Math.max(60, Math.round(w / knownAr)) : 240;
              const rawX = Math.round((e.clientX - canvasLeft) - w / 2);
              const x = Math.max(0, rawX);
              const y = Math.max(0, Math.round((e.clientY - canvasTop) - h / 2));
              setBlocks((b) => {
                const others = b;
                const proposed = { x, y, width: w, height: h };
                const adjusted = adjustForProtectedOverlap(proposed, others, false);
                return [...b, { type: "image", id: data.id, frame: adjusted } as EditorBlock];
              });
            }
          } catch {}
        }}
        sx={{
          position: 'relative',
          minHeight: 1200,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '10px 10px, 10px 10px',
          backgroundPosition: '0 0, 0 0',
          overflowX: 'hidden',
          overflowY: 'auto',
          width: CANVAS_CONTENT_WIDTH,
          maxWidth: '100%',
          mx: 'auto'
        }}
      >
        {blocks.length === 0 && (
          <Typography variant="body2" color="text.secondary">No blocks yet. Use buttons above to add sections.</Typography>
        )}
        {blocks.filter((b) => !EDITOR_HIDDEN_TYPES.includes(b.type)).map((block, i) => {
          const frame = (block as { frame?: { x: number; y: number; width: number; height: number } }).frame ?? { x: 0, y: 0, width: 600, height: 200 };
          return (
          <Rnd
            key={i}
            size={{ width: frame.width, height: frame.height }}
            position={{ x: frame.x, y: frame.y }}
            enableResizing={((block as { type: string }).type === 'image')
              ? { topLeft: true, topRight: false, bottomRight: true, bottomLeft: false, top: false, right: false, bottom: false, left: false }
              : { topLeft: true, topRight: true, bottomRight: true, bottomLeft: true, top: true, right: true, bottom: true, left: true }}
            resizeHandleStyles={RESIZE_HANDLE_STYLES}
            dragHandleClassName="layout-block-handle"
            lockAspectRatio={(block as { type: string }).type === 'image'
              ? (() => {
                  const id = (block as { type: 'image'; id?: string }).id;
                  const ar = id ? imageAspectById[id!] : undefined;
                  if (ar && ar > 0) return ar;
                  const f = (block as { frame?: { width?: number; height?: number } }).frame;
                  const fw = Math.max(1, f?.width ?? 1);
                  const fh = Math.max(1, f?.height ?? 1);
                  return fw / fh; // fallback to current frame ratio until image loads
                })()
              : false}
            onDragStop={(_, d) => {
              setBlocks((b) => {
                const current = b[i] as EditorBlock;
                const curf = ((current as unknown as { frame?: { x: number; y: number; width: number; height: number } }).frame) ?? { x: 0, y: 0, width: 600, height: 200 };
                const maxX = Math.max(0, canvasWidth - curf.width);
                const px = Math.round(Math.max(0, Math.min(d.x, maxX)));
                const py = Math.round(Math.max(0, d.y));
                const proposed = { x: px, y: py, width: Math.round(curf.width), height: Math.round(curf.height) };
                const others = b.filter((_, idx) => idx !== i);
                const adjusted = adjustForProtectedOverlap(proposed, others, isProtected(current));
                const updated = { ...current, frame: adjusted } as EditorBlock;
                const next = [...b];
                next[i] = updated;
                return next;
              });
            }}
            onResizeStop={(_, __, ref, delta, position) => {
              const rawWidth = Math.max(80, parseInt(ref.style.width || '0', 10));
              const rawHeight = Math.max(60, parseInt(ref.style.height || '0', 10));
              setBlocks((b) => {
                const current = b[i] as EditorBlock;
                const isImage = (current as { type: string }).type === 'image';
                const isGallery = (current as { type: string }).type === 'gallery';
                let width = rawWidth;
                let height = rawHeight;
                if (isImage) {
                  const id = (current as { type: 'image'; id?: string }).id;
                  const ar = id ? imageAspectById[id] : undefined;
                  if (ar && ar > 0) {
                    const hFromW = Math.round(width / ar);
                    const wFromH = Math.round(height * ar);
                    const dH = Math.abs(hFromW - height);
                    const dW = Math.abs(wFromH - width);
                    if (dH <= dW) {
                      height = Math.max(60, hFromW);
                    } else {
                      width = Math.max(80, wFromH);
                      height = Math.max(60, Math.round(width / ar));
                    }
                    // Ensure each image block keeps its own width/height independent of others
                    // by not mutating shared aspect ratios and only updating this block's frame.
                  }
                }
                if (isGallery) {
                  const items = (((current as unknown as { items?: string[] }).items) ?? []) as string[];
                  // Clamp width to stay within right border
                  width = Math.min(width, Math.max(80, canvasWidth - Math.max(0, position.x)));
                  // Enforce minimum height so that all items are visible
                  const minH = computeGalleryMinHeight(width, items.length);
                  height = Math.max(minH, height);
                }
                // Clamp to the right border of the editor
                const clampedX = Math.round(Math.max(0, Math.min(position.x, Math.max(0, canvasWidth - width))));
                const clampedY = Math.round(Math.max(0, position.y));
                const proposed = { x: clampedX, y: clampedY, width: Math.round(width), height: Math.round(height) };
                const clamped = proposed;
                const others = b.filter((_, idx) => idx !== i);
                const adjusted = adjustForProtectedOverlap(clamped, others, isProtected(current));
                const updated = { ...current, frame: adjusted } as EditorBlock;
                const next = [...b];
                next[i] = updated;
                return next;
              });
            }}
            style={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 4, padding: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(3px)', overflow: (block as { type: string }).type === 'image' ? 'visible' : 'hidden' }}
          >
            <Stack sx={{ height: '100%', position: 'relative' }}>
              {((block as { type: string }).type !== 'image') ? (
                <Stack className="layout-block-handle" direction="row" alignItems="center" gap={1} justifyContent="space-between">
                  <Stack direction="row" gap={1} alignItems="center">
                    <GripVerticalIcon size={16} />
                    <Typography variant="subtitle2">{(block.type === 'richText' && typeof (block as any).content === 'object' && (block as any).content && (block as any).content.source === 'details') ? 'richText (details)' : block.type}</Typography>
                  </Stack>
                  <Stack direction="row" gap={1}>
                    <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0}><MoveUpIcon size={16} /></IconButton>
                    <IconButton size="small" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><MoveDownIcon size={16} /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(i)}><Trash2Icon size={16} /></IconButton>
                  </Stack>
                </Stack>
              ) : (
                <Stack className="layout-block-handle" direction="row" alignItems="center" gap={1} justifyContent="space-between"
                  sx={{ position: 'absolute', top: 4, left: 8, right: 8, zIndex: 2, pointerEvents: 'auto', bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 1, px: 1 }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <GripVerticalIcon size={16} />
                    <Typography variant="subtitle2">{block.type}</Typography>
                  </Stack>
                  <Stack direction="row" gap={1}>
                    <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0}><MoveUpIcon size={16} /></IconButton>
                    <IconButton size="small" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><MoveDownIcon size={16} /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(i)}><Trash2Icon size={16} /></IconButton>
                  </Stack>
                </Stack>
              )}
              <Box sx={{ mt: ((block as { type: string }).type !== 'image') ? 1 : 0, flex: 1, minHeight: 0, position: 'relative', overflow: (block as { type: string }).type === 'image' ? 'visible' : 'hidden' }}>
              {block.type === "richText" && (
                <Box sx={{ width: '100%', overflow: 'hidden' }}>
                  {(() => {
                    const c: any = (block as any).content;
                    const isDetails = c && typeof c === 'object' && c.source === 'details';
                    if (isDetails) {
                      return (
                        <Typography variant="body2" color="text.secondary">
                          This block mirrors your novel details. Edit the novel details to change it.
                        </Typography>
                      );
                    }
                    return (
                      <RichTextEditor
                        value={(block as { type: 'richText'; content?: unknown }).content}
                        onChange={(doc) => {
                          try {
                            richTextBlockSchema.parse({ type: "richText", content: doc });
                            setBlocks((b) => b.map((x, idx) => idx === i ? ({ type: "richText", content: doc }) as EditorBlock : x));
                          } catch {}
                        }}
                      />
                    );
                  })()}
                </Box>
              )}
              {block.type === "spacer" && (
                <Box sx={{ width: '100%', height: '100%', bgcolor: 'transparent', border: '1px dashed rgba(0,0,0,0.1)' }} />
              )}
              {block.type === "gallery" && (
                <Box sx={{ width: '100%', height: '100%' }}>
                  <Box
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      try {
                        const raw = e.dataTransfer.getData("application/json");
                        if (!raw) return;
                        const data = JSON.parse(raw);
                        if (data?.kind === "asset-image" && typeof data.id === 'string') {
                          const current = ((block as { type: 'gallery'; items?: string[] }).items ?? []) as string[];
                          const next = Array.from(new Set([...current, data.id]));
                          galleryBlockSchema.parse({ type: "gallery", items: next });
                          setBlocks((b) => b.map((x, idx) => idx === i ? ({ type: "gallery", items: next }) as EditorBlock : x));
                        }
                        if (data?.kind === "galleryItem" && typeof data.index === 'number') {
                          // handled by item-level drop below
                        }
                      } catch {}
                    }}
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                      border: '1px dashed rgba(0,0,0,0.2)',
                      p: 1,
                      borderRadius: 1,
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(() => {
                      const items = (((block as { type: 'gallery'; items?: string[] }).items ?? []) as string[]);
                      const ids = items.length > 0 ? items : (novel.galleryItems ?? []).map((g) => g.id);
                      const visibleIds = ids.filter((id) => !hiddenGalleryItemIds.includes(id));
                      return visibleIds.map((id: string, giIndex: number) => {
                        const item = novel.galleryItems.find((g) => g.id === id);
                        if (!item) return null;
                        return (
                          <Box
                            key={id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/json", JSON.stringify({ kind: 'galleryItem', galleryBlock: i, index: giIndex }));
                            }}
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => {
                              try {
                                const raw = e.dataTransfer.getData("application/json");
                                if (!raw) return;
                                const data = JSON.parse(raw);
                                if (data?.kind === 'galleryItem' && data.galleryBlock === i) {
                                  const from = data.index as number;
                                  const to = giIndex;
                                  if (from === to) return;
                                  const current = (((block as { type: 'gallery'; items?: string[] }).items ?? []) as string[]);
                                  const next = [...current];
                                  const [moved] = next.splice(from, 1);
                                  next.splice(to, 0, moved);
                                  galleryBlockSchema.parse({ type: "gallery", items: next });
                                  setBlocks((b) => b.map((x, idx) => idx === i ? ({ type: "gallery", items: next }) as EditorBlock : x));
                                }
                              } catch {}
                            }}
                            sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
                          >
                            <SafeImage src={item.imageUrl} alt={item.footer ?? 'Image'} fill sizes="(max-width: 600px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                            <IconButton
                              size="small"
                              onClick={() => {
                                const current = (((block as { type: 'gallery'; items?: string[] }).items ?? []) as string[]);
                                const next = current.filter((x) => x !== id);
                                setBlocks((b) => b.map((x, idx) => idx === i ? ({ type: "gallery", items: next }) as EditorBlock : x));
                              }}
                              sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                              aria-label="Remove image"
                            >
                              <XIcon size={14} />
                            </IconButton>
                          </Box>
                        );
                      });
                    })()}
                  </Box>
                </Box>
              )}
              {block.type === "image" && (
                <Box
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    try {
                      const raw = e.dataTransfer.getData("application/json");
                      if (!raw) return;
                      const data = JSON.parse(raw);
                      if (data?.kind === "asset-image" && typeof data.id === 'string') {
                        imageBlockSchema.parse({ type: "image", id: data.id });
                        setBlocks((b) => b.map((x, idx) => idx === i ? ({ type: "image", id: data.id }) as EditorBlock : x));
                      }
                    } catch {}
                  }}
                  sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {(() => {
                    const id = (block as { type: 'image'; id?: string }).id;
                    const item = id ? novel.galleryItems.find((g) => g.id === id) : null;
                    if (item) {
                      return (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                          <SafeImage
                            src={item.imageUrl}
                            alt={item.footer ?? 'Image'}
                            width={1200}
                            height={800}
                            onLoadingComplete={(img) => {
                              const ar = img.naturalWidth / Math.max(1, img.naturalHeight);
                              if (id && ar > 0 && Number.isFinite(ar)) {
                                setImageAspectById((prev) => (prev[id!] === ar ? prev : { ...prev, [id!]: ar }));
                              }
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                          />
                        </Box>
                      );
                    }
                    return (
                      <Typography variant="body2" color="text.secondary">Drop an image here</Typography>
                    );
                  })()}
                </Box>
              )}
              {(block.type === "updates" || block.type === "ratings" || block.type === "ratingsList" || block.type === "comments") && null}
              </Box>
            </Stack>
          </Rnd>
        );})}
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={1}>
        <Button variant="outlined" color="error" onClick={revertToDefaults}>Revert to site defaults</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={isUpdatingLayout}>Save layout</Button>
      </Stack>

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onClose={() => setImagePickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select an image from gallery</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "1fr 1fr 1fr 1fr" },
            }}
          >
            {(novel.galleryItems ?? []).map((gi) => {
              const isSelected = imagePickerSelected === gi.id;
              return (
                <Box
                  key={gi.id}
                  onClick={() => setImagePickerSelected(gi.id)}
                  onDoubleClick={() => {
                    setImagePickerSelected(gi.id);
                    // Insert immediately on double click with same sizing logic as drag-and-drop
                    insertImageWithInitialFrame(gi.id);
                    setImagePickerOpen(false);
                  }}
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: 1,
                    overflow: "hidden",
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                  }}
                  title={gi.footer ?? "Image"}
                >
                  <SafeImage
                    src={gi.imageUrl}
                    alt={gi.footer ?? "Image"}
                    fill
                    sizes="(max-width: 600px) 50vw, 25vw"
                    onLoadingComplete={(img) => {
                      const ar = img.naturalWidth / Math.max(1, img.naturalHeight);
                      if (gi.id && ar > 0 && Number.isFinite(ar)) {
                        setImageAspectById((prev) => (prev[gi.id] === ar ? prev : { ...prev, [gi.id]: ar }));
                      }
                    }}
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!imagePickerSelected) return;
              insertImageWithInitialFrame(imagePickerSelected);
              setImagePickerOpen(false);
            }}
            disabled={!imagePickerSelected}
          >
            Add image
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function snippetToDoc(snippet: string): unknown {
  // Minimal TipTap/ProseMirror JSON document from plain text paragraphs
  const lines = snippet.split(/\n+/).map((s) => s.trim());
  const content = lines.map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }));
  return { type: "doc", content } as const;
}

function assignFrames(input: EditorBlock[], canvasWidth: number = 1152): EditorBlock[] {
  // Stack vertically with margins to avoid overlap when no frames exist
  const result: EditorBlock[] = [];
  let y = 20;
  const sidePadding = 20;
  const maxWidth = Math.max(200, canvasWidth - sidePadding * 2);
  for (const b of input) {
    const hasFrame = !!(b as { frame?: unknown }).frame;
    const height = b.type === 'gallery' ? 320 : b.type === 'image' ? 260 : b.type === 'richText' ? 220 : 180;
    result.push(hasFrame ? b : ({ ...b, frame: { x: sidePadding, y, width: maxWidth, height } }) as EditorBlock);
    y += height + 20;
  }
  return result;
}

function stackAtEnd(blocks: EditorBlock[], next: EditorBlock, canvasWidth: number = 1152): EditorBlock[] {
  const arranged = assignFrames([...blocks], canvasWidth);
  const maxY = arranged.reduce((acc, b) => Math.max(acc, ((b as { frame?: { y?: number; height?: number } }).frame?.y ?? 0) + ((b as { frame?: { height?: number } }).frame?.height ?? 0)), 0);
  const sidePadding = 20;
  const width = Math.max(80, canvasWidth - sidePadding * 2);
  let height = next.type === 'image' ? 260 : next.type === 'gallery' ? 320 : 200;
  if (next.type === 'gallery') {
    const itemsCount = (((next as unknown as { items?: string[] }).items) ?? []).length;
    height = computeGalleryMinHeight(width, itemsCount);
  }
  const candidate = { ...next, frame: { x: sidePadding, y: maxY + 20, width, height } } as EditorBlock;
  return [...arranged, candidate];
}

function isProtected(b: EditorBlock): boolean {
  return b.type === 'ratings' || b.type === 'ratingsList' || b.type === 'updates';
}

type Rect = { x: number; y: number; width: number; height: number };

function adjustForProtectedOverlap(proposed: Rect, others: EditorBlock[], isSelfProtected: boolean): Rect {
  const protectedRects: Rect[] = others
    .filter((b) => isProtected(b))
    .map((b) => ((b as unknown as { frame?: Rect }).frame) as Rect)
    .filter((f): f is Rect => !!f);

  if (protectedRects.length === 0) return proposed;

  // If moving a protected block, ensure it doesn't overlap other protected blocks.
  // If moving a normal block, ensure it doesn't overlap any protected block.
  const blockers = isSelfProtected ? protectedRects : protectedRects;

  const rect = { ...proposed };
  const maxIterations = 50;
  let iter = 0;
  while (iter++ < maxIterations && overlapsAny(rect, blockers)) {
    // Push down by 20px to avoid overlap (simple resolution strategy)
    rect.y += 20;
  }
  return rect;
}

function overlapsAny(a: Rect, blocks: Rect[]): boolean {
  return blocks.some((b) => overlaps(a, b));
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Compute minimum gallery height needed to display all items without cropping, given width
function computeGalleryMinHeight(containerWidth: number, itemsCount: number): number {
  const GAP = 4; // in px (matches gap: 1 theme spacing ~ 8px, but safer to use a smaller visual gap)
  const columns = containerWidth < 600 ? 1 : containerWidth < 900 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(itemsCount / columns));
  // Each tile uses 4:3 aspect ratio; with gaps between rows
  const tileWidth = Math.max(80, Math.floor((containerWidth - (columns - 1) * GAP) / columns));
  const tileHeight = Math.round(tileWidth * 3 / 4);
  const totalHeight = rows * tileHeight + (rows - 1) * GAP + 16; // include inner padding from gallery container
  return Math.max(120, totalHeight);
}

