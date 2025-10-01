"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useNovel } from "../providers";
import { DEFAULT_NOVEL_COVER_URL } from "../components/constants";
import { Links } from "../components/Links";
import { NovelComments, NovelDownloads, NovelRatings, NovelRatingsList, NovelGallery, NovelUpdates } from "../components";
import { NovelTags } from "../components/NovelTags";
import { SafeImage } from "@/generic/display";
import { SanitizedHtml } from "@/generic/display";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { FontSize } from "@/generic/input/extensions/FontSize";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { HorizontalRuleEx } from "@/generic/input/extensions/HorizontalRuleEx";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Modal, ModalActions, ModalContent, ModalTitle, Selector } from "@/generic/input";
import { useUser } from "@/users/providers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { collectionKeys, useRegistry } from "@/utils/client";
import { ListedCollection } from "@/contracts/collections";
import { toast } from "react-toastify";

export function NovelDetailsPage() {
  const { novel, canEdit } = useNovel();
  const { user } = useUser();
  const { collections } = useRegistry();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ListedCollection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  const collectionsQuery = useQuery({
    queryKey: collectionKeys.mine(),
    queryFn: () => collections.getMyCollections(),
    enabled: !!user,
  });

  const createCollection = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      collections.createCollection(body),
    onSuccess: (c) => {
      collectionsQuery.refetch();
      toast.success(`Collection "${c.name ?? "Untitled"}" created`);
    },
  });
  const addToCollection = useMutation({
    mutationFn: (payload: { collectionId: string; novelId: string }) =>
      collections.addNovel(payload.collectionId, { novelId: payload.novelId }),
    onSuccess: () => toast.success("Added to collection"),
  });

  if (!novel) {
    return;
  }

  const description = novel.snippet;
  const pageBackgroundUrl = (novel as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl || undefined;
  const foregroundOpacityPercent = (novel as unknown as { foregroundOpacityPercent?: number | null }).foregroundOpacityPercent ?? 95;
  const foregroundColorHex = (novel as unknown as { foregroundColorHex?: string | null }).foregroundColorHex || "#121212";
  const foregroundTextColorHex = (novel as unknown as { foregroundTextColorHex?: string | null }).foregroundTextColorHex || "#ffffff";
  const buttonBgColorHex = (novel as unknown as { buttonBgColorHex?: string | null }).buttonBgColorHex || foregroundColorHex;
  const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
  const hasRich = !!rich;
  const thumbnailUrl = novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL;

  return (
    <>
      {pageBackgroundUrl && (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            backgroundImage: `url(${pageBackgroundUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {pageBackgroundUrl && (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          }}
        />
      )}
      <Box sx={{ minHeight: "100dvh", color: foregroundTextColorHex }}>
        <Box
          sx={{
            position: "relative",
            mx: { xs: 0, md: "auto" },
            width: { xs: "100%", md: "auto" },
            maxWidth: { xs: "100%", md: 1200 },
            minHeight: "100dvh",
            borderRadius: { xs: 2, md: 2 },
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: foregroundColorHex,
              opacity: Math.max(0, Math.min(100, foregroundOpacityPercent)) / 100,
            }}
          />
          <Box sx={{ position: "relative", px: { xs: 1, sm: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
            <Stack sx={{ py: 4 }} gap={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={4}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Stack gap={2} sx={{ flex: 1, order: { xs: 1, md: 0 } }}>
            <Typography variant="h4" component="h1">
              {novel.title}{" "}
              {canEdit && (
                <IconButton
                  LinkComponent={Link}
                  href={`/novels/${novel.id}/edit`}
                  aria-label="Edit Novel"
                >
                  <PencilIcon />
                </IconButton>
              )}
            </Typography>
            <Typography variant="subtitle1">
              by {" "}
              <Link href={`/authors/${novel.author.id}`} style={{ color: 'inherit' }}>
                {novel.author.name}
              </Link>
            </Typography>
            <Links
              novel={novel}
              buttonBgColor={buttonBgColorHex}
              buttonTextColor={foregroundTextColorHex}
            />
            <NovelDownloads
              novel={novel}
              buttonBgColor={buttonBgColorHex}
              buttonTextColor={foregroundTextColorHex}
            />
            {user && (
              <Stack direction="row" gap={2}>
                <Button
                  variant="contained"
                  onClick={() => setIsOpen(true)}
                  sx={{ bgcolor: buttonBgColorHex, color: foregroundTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
                >
                  Add to collection
                </Button>
              </Stack>
            )}
          </Stack>
          <Box sx={{ width: { xs: "100%", md: 400 }, ml: { md: "auto" }, order: { xs: 0, md: 1 } }}>
            <SafeImage
              src={thumbnailUrl}
              alt={`Cover for ${novel.title}`}
              width={400}
              height={300}
              priority
              sizes="(max-width: 600px) 100vw, 400px"
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          </Box>
            </Stack>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", '& .MuiChip-root': { boxShadow: '0 2px 6px rgba(0,0,0,0.25)' } }}>
              <NovelTags
                tags={novel.tags}
                chipSize="medium"
                bgColor={buttonBgColorHex}
                textColor={foregroundTextColorHex}
              />
              {Array.isArray((novel as unknown as { indexingTags?: string[] }).indexingTags) &&
                (novel as unknown as { indexingTags?: string[] }).indexingTags!.length > 0 && (
                <NovelTags
                  tags={(novel as unknown as { indexingTags: string[] }).indexingTags}
                  chipSize="medium"
                  bgColor={buttonBgColorHex}
                  textColor={foregroundTextColorHex}
                />
              )}
            </Box>
          </Stack>
          {hasRich ? (
            <Box sx={{ color: 'text.primary', '& p:empty::before': { content: '"\\00A0"' }, '& p:empty': { minHeight: '24px' } }}>
              <SanitizedHtml html={JSONToHtml(rich)} />
            </Box>
          ) : description ? (
            description.split("\n").map((paragraph, idx) => (
              <Typography
                key={`${idx}-${paragraph}`}
                variant="body1"
                color="text.secondary"
                sx={{ mb: 2, minHeight: 24 }}
              >
                {paragraph.trim().length === 0 ? '\u00A0' : paragraph}
              </Typography>
            ))
          ) : (
            <Typography variant="body1" color="text.secondary" fontStyle="italic">
              No description available.
            </Typography>
          )}
          <Box my={4}>
            <NovelGallery />
          </Box>
          <Box my={2}>
            <NovelUpdates />
          </Box>
          <Box my={4}>
            <NovelRatings buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
          </Box>
          <Box my={2}>
            <NovelRatingsList />
          </Box>
          <Box my={4}>
            <NovelComments buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
          </Box>
          {user && (
            <Modal
              isOpen={isOpen}
              close={() => setIsOpen(false)}
              onSubmit={async () => {
                let collectionId = selectedCollection?.id;
                if (!collectionId && newCollectionName) {
                  const created = await createCollection.mutateAsync({
                    name: newCollectionName,
                    description: newCollectionDescription || undefined,
                  });
                  collectionId = created.id;
                }
                if (collectionId) {
                  await addToCollection.mutateAsync({
                    collectionId,
                    novelId: novel.id,
                  });
                  setIsOpen(false);
                  setSelectedCollection(null);
                  setNewCollectionName("");
                  setNewCollectionDescription("");
                }
              }}
            >
              <ModalTitle>Add to your collection</ModalTitle>
              <ModalContent>
                <Stack gap={2}>
                  <Selector<ListedCollection>
                    label="Select a collection"
                    options={(collectionsQuery.data ?? [])
                      .filter((c) => !c.isFollowing)
                      .map((c) => ({
                      label: `${c.name} (${c.itemsCount})`,
                      value: c,
                    }))}
                    value={selectedCollection}
                    onChange={setSelectedCollection}
                    placeholder="Choose an existing collection"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Or create a new collection
                  </Typography>
                  <Stack gap={1}>
                    <TextField
                      label="New collection name"
                      placeholder="e.g. My favorites"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Description (optional)"
                      placeholder="Short description"
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </ModalContent>
              <ModalActions
                close={() => setIsOpen(false)}
                submitAction={selectedCollection || newCollectionName ? "Add" : undefined}
                loading={createCollection.isPending || addToCollection.isPending}
                cancelColor="error"
                submitColor="primary"
                placeCancelAfterSubmit
              />
            </Modal>
          )}
          </Box>
        </Box>
      </Box>
    </>
  );
}

function JSONToHtml(json: unknown): string {
  try {
    if (!json) return "";
    // Use TipTap server-side HTML generator to render a safe subset
    let html = generateHTML(json as never, [
      StarterKit.configure({ heading: { levels: [2,3,4] } }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRuleEx,
      Underline,
      TiptapLink.configure({ protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ]);
    // Safeguard: if hr attributes were dropped, enforce styles based on JSON attrs order
    const hrStyles: { thickness: number; color: string }[] = [];
    try {
      collectHrStyles(json as never, hrStyles);
      if (hrStyles.length > 0) {
        let idx = 0;
        html = html.replace(/<hr\b[^>]*>/g, (match) => {
          const s = hrStyles[idx++];
          if (!s) return match;
          const style = `border: none; border-top: ${Math.max(1, s.thickness || 1)}px solid ${s.color || '#9ca3af'}; margin: 12px 0;`;
          // Preserve any existing attributes except style
          const withoutStyle = match.replace(/\sstyle="[^"]*"/i, "");
          return withoutStyle.replace(/<hr/, `<hr style=\"${style}\"`);
        });
      }
    } catch {}
    // Preserve visually blank lines: convert <p><br/></p> to <p>&nbsp;</p>
    html = html.replace(/<p>\s*<br\s*\/?>(\s*)<\/p>/gi, '<p>&nbsp;</p>');
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
