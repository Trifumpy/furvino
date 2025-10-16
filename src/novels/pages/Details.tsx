"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useNovel } from "../providers/ClientNovelProvider";
import { DEFAULT_NOVEL_COVER_URL } from "../components/constants";
import { Links } from "../components/Links";
import { NovelComments, NovelDownloads, NovelRatingsList, NovelUpdates } from "../components";
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
import { PencilIcon, XIcon } from "lucide-react";
import { useState, useLayoutEffect, useRef } from "react";
import { Modal, ModalActions, ModalContent, ModalTitle, Selector } from "@/generic/input";
import { useUser } from "@/users/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authorKeys, collectionKeys, useRegistry } from "@/utils/client";
import { ListedCollection } from "@/contracts/collections";
import { toast } from "react-toastify";
import { LayoutBlock, NovelLayout } from "@/contracts/novels";

export function NovelDetailsPage() {
  const { novel, canEdit } = useNovel();
  const { user } = useUser();
  const { collections } = useRegistry();
  const [isOpen, setIsOpen] = useState(false);
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState<string | null>(null);
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
  const foregroundOpacityPercent = (novel as unknown as { foregroundOpacityPercent?: number | null }).foregroundOpacityPercent ?? 80;
  const foregroundBlurPercent = (novel as unknown as { foregroundBlurPercent?: number | null }).foregroundBlurPercent ?? 20;
  const foregroundColorHex = (novel as unknown as { foregroundColorHex?: string | null }).foregroundColorHex || "#121212";
  const foregroundTextColorHex = (novel as unknown as { foregroundTextColorHex?: string | null }).foregroundTextColorHex || "#ffffff";
  const buttonBgColorHex = (novel as unknown as { buttonBgColorHex?: string | null }).buttonBgColorHex || foregroundColorHex;
  const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
  const hasRich = !!rich;
  const thumbnailUrl = novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL;
  const pageLayout = (novel as { pageLayout?: NovelLayout | null }).pageLayout;
  const hideThumb = ((novel as unknown as { pageLayout?: { settings?: { hideThumbnail?: boolean } } | null }).pageLayout?.settings?.hideThumbnail) === true;
  const hideTags = ((novel as unknown as { pageLayout?: { settings?: { hideTags?: boolean } } | null }).pageLayout?.settings?.hideTags) === true;

  function hexToRgba(hex: string, alpha: number): string {
    const cleaned = (hex || "").replace(/^#/, "");
    const isShort = cleaned.length === 3;
    const r = parseInt(isShort ? cleaned[0] + cleaned[0] : cleaned.substring(0, 2), 16) || 0;
    const g = parseInt(isShort ? cleaned[1] + cleaned[1] : cleaned.substring(2, 4), 16) || 0;
    const b = parseInt(isShort ? cleaned[2] + cleaned[2] : cleaned.substring(4, 6), 16) || 0;
    const a = Math.max(0, Math.min(1, alpha || 0));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

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
              backgroundColor: hexToRgba(
                foregroundColorHex,
                Math.max(0, Math.min(100, foregroundOpacityPercent)) / 100
              ),
              backdropFilter: `blur(${Math.round(Math.max(0, Math.min(100, foregroundBlurPercent)) * 0.5)}px)`,
              WebkitBackdropFilter: `blur(${Math.round(Math.max(0, Math.min(100, foregroundBlurPercent)) * 0.5)}px)`,
              pointerEvents: "none",
            }}
          />
          <Box sx={{ position: "relative", px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
            <Stack sx={{ py: 4 }} gap={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={4}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Stack gap={2} sx={{ flex: 1, order: { xs: hideThumb ? 0 : 1, md: 0 } }}>
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
            {!hideThumb && (
              <>
                <NovelDownloads
                  novel={novel}
                  buttonBgColor={buttonBgColorHex}
                  buttonTextColor={foregroundTextColorHex}
                />
                {user && (
                  <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                    <Button
                      variant="contained"
                      onClick={() => setIsOpen(true)}
                      sx={{ bgcolor: buttonBgColorHex, color: foregroundTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
                    >
                      Add to collection
                    </Button>
                    <FollowAuthorButton authorId={novel.author.id} buttonBgColorHex={buttonBgColorHex} buttonTextColorHex={foregroundTextColorHex} />
                  </Stack>
                )}
              </>
            )}
            {!hideTags && !hideThumb && (
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
            )}
            {/* Downloads/actions/tags are rendered in the right column for desktop spacing */}
          </Stack>
          <Box sx={{ width: { xs: "100%", md: 400 }, ml: { md: "auto" }, order: { xs: hideThumb ? 1 : 0, md: 1 } }}>
            <Stack gap={2}>
              {!hideThumb && (
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
              )}
              {hideThumb && (
                <>
                  <NovelDownloads
                    novel={novel}
                    buttonBgColor={buttonBgColorHex}
                    buttonTextColor={foregroundTextColorHex}
                  />
                  {user && (
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                      <Button
                        variant="contained"
                        onClick={() => setIsOpen(true)}
                        sx={{ bgcolor: buttonBgColorHex, color: foregroundTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
                      >
                        Add to collection
                      </Button>
                      <FollowAuthorButton authorId={novel.author.id} buttonBgColorHex={buttonBgColorHex} buttonTextColorHex={foregroundTextColorHex} />
                    </Stack>
                  )}
                </>
              )}
              {!hideTags && hideThumb && (
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
              )}
            </Stack>
          </Box>
            </Stack>
            
          </Stack>
          {!pageLayout ? (
            hasRich ? (
              <Box sx={{ color: 'text.primary', '& p:empty::before': { content: "\"\\00A0\"" }, '& p:empty': { minHeight: '24px' } }}>
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
            )
          ) : (
            <>
              {/* Defaults shown only when foreground is not fully expanded (< lg) */}
              <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                {hasRich ? (
                  <Box sx={{ color: 'text.primary', '& p:empty::before': { content: "\"\\00A0\"" }, '& p:empty': { minHeight: '24px' } }}>
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
                <Stack gap={3} sx={{ mt: 2, width: '100%' }}>
                  {(() => {
                    const compactGallery = ((novel as unknown as { pageLayout?: { settings?: { compactGallery?: boolean } } | null }).pageLayout?.settings?.compactGallery) === true;
                    const hiddenIds = ((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds) ?? [];
                    const ordered = [...(novel.galleryItems ?? [])].sort((a, b) => {
                      const sa = getGallerySlotIndex(a.imageUrl);
                      const sb = getGallerySlotIndex(b.imageUrl);
                      if (sa !== sb) return sa - sb;
                      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    }).filter((gi) => !hiddenIds.includes(gi.id));
                    if (ordered.length > 0) {
                      if (compactGallery) {
                        const tileHeight = 240;
                        const tileWidth = Math.round(tileHeight * 4 / 3);
                        return (
                          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                            {ordered.map((gi) => (
                              <Box key={gi.id} onClick={() => setGalleryPreviewUrl(gi.imageUrl)} sx={{ position: 'relative', flex: '0 0 auto', width: tileWidth, height: tileHeight, borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                                <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes={`${tileWidth}px`} style={{ objectFit: 'cover' }} />
                              </Box>
                            ))}
                          </Box>
                        );
                      } else {
                        return (
                          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                            {ordered.map((gi) => (
                              <Box key={gi.id} onClick={() => setGalleryPreviewUrl(gi.imageUrl)} sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                                <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
                              </Box>
                            ))}
                          </Box>
                        );
                      }
                    }
                    return null;
                  })()}
                  <NovelUpdates />
                  <NovelRatingsList buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
                  <NovelComments buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
                </Stack>
              </Box>

              {/* Editor layout only when fully expanded (>= lg) */}
              <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                {isFramedLayout(pageLayout) ? (
                  <FramedLayoutRenderer
                    layout={pageLayout}
                    buttonBgColorHex={buttonBgColorHex}
                    foregroundTextColorHex={foregroundTextColorHex}
                    onOpenGallery={(url: string) => setGalleryPreviewUrl(url)}
                  />
                ) : (
                  (() => {
                    const all = Array.isArray(pageLayout.blocks) ? pageLayout.blocks : [];
                    const freeBlocks = all.filter((b) => !isProtectedBlock(b));
                    return (
                      <>
                        {freeBlocks.length === 0 ? (
                          hasRich ? (
                            <Box sx={{ color: 'text.primary', '& p:empty::before': { content: "\"\\00A0\"" }, '& p:empty': { minHeight: '24px' } }}>
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
                          ) : null
                        ) : (
                          <Stack gap={3}>
                            {freeBlocks.map((block, idx) => (
                              <LayoutBlockRenderer key={idx} block={block} buttonBgColorHex={buttonBgColorHex} foregroundTextColorHex={foregroundTextColorHex} />
                            ))}
                          </Stack>
                        )}
                        <Stack gap={3} sx={{ mt: 2, width: '100%' }}>
                          {(() => {
                            const compactGallery = ((novel as unknown as { pageLayout?: { settings?: { compactGallery?: boolean } } | null }).pageLayout?.settings?.compactGallery) === true;
                            const hiddenIds = ((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds) ?? [];
                            const ordered = [...(novel.galleryItems ?? [])].sort((a, b) => {
                              const sa = getGallerySlotIndex(a.imageUrl);
                              const sb = getGallerySlotIndex(b.imageUrl);
                              if (sa !== sb) return sa - sb;
                              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                            }).filter((gi) => !hiddenIds.includes(gi.id));
                            if (ordered.length > 0) {
                              if (compactGallery) {
                                const tileHeight = 240;
                                const tileWidth = Math.round(tileHeight * 4 / 3);
                                return (
                                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                                    {ordered.map((gi) => (
                                      <Box key={gi.id} onClick={() => setGalleryPreviewUrl(gi.imageUrl)} sx={{ position: 'relative', flex: '0 0 auto', width: tileWidth, height: tileHeight, borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                                        <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes={`${tileWidth}px`} style={{ objectFit: 'cover' }} />
                                      </Box>
                                    ))}
                                  </Box>
                                );
                              } else {
                                return (
                                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                                    {ordered.map((gi) => (
                                      <Box key={gi.id} onClick={() => setGalleryPreviewUrl(gi.imageUrl)} sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                                        <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
                                      </Box>
                                    ))}
                                  </Box>
                                );
                              }
                            }
                            return null;
                          })()}
                          <NovelUpdates />
                          <NovelRatingsList buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
                          <NovelComments buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
                        </Stack>
                      </>
                    );
                  })()
                )}
              </Box>
            </>
          )}
          {user && (
            <>
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
            {/* Gallery fullscreen preview - rendered once at page bottom */}
            </>
          )}
          <Modal
            isOpen={!!galleryPreviewUrl}
            close={() => setGalleryPreviewUrl(null)}
            maxWidth="xl"
            fullWidth
            fullScreen
            p={0}
            slotProps={{
              paper: {
                sx: {
                  width: "100dvw",
                  height: "100dvh",
                  maxWidth: "100dvw",
                  maxHeight: "100dvh",
                  m: 0,
                  bgcolor: "transparent",
                  borderRadius: 0,
                  boxShadow: "none",
                  border: "none",
                  overflow: "hidden",
                },
              },
              backdrop: {
                sx: {
                  backgroundColor: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                },
              },
            }}
          >
            <ModalContent
              sx={{
                p: 0,
                pt: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                bgcolor: "transparent",
                position: "relative",
                width: "100%",
                height: "100%",
              }}
              onClick={() => setGalleryPreviewUrl(null)}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  aria-label="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryPreviewUrl(null);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    color: "#fff",
                    bgcolor: "rgba(0,0,0,0.5)",
                  }}
                >
                  <XIcon />
                </IconButton>
                {galleryPreviewUrl ? (
                  <Box
                    component="img"
                    src={galleryPreviewUrl}
                    alt="Gallery image"
                    sx={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center",
                    }}
                  />
                ) : null}
              </Box>
            </ModalContent>
          </Modal>
          </Box>
        </Box>
      </Box>
    </>
  );
}

function FollowAuthorButton({ authorId, buttonBgColorHex, buttonTextColorHex }: { authorId: string; buttonBgColorHex: string; buttonTextColorHex: string }) {
  const { authors } = useRegistry();
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: authorKeys.author(authorId),
    queryFn: () => authors.getAuthorById(authorId),
  });
  const isFollowing = !!(data as unknown as { isFollowing?: boolean })?.isFollowing;

  const follow = useMutation({
    mutationFn: () => authors.follow(authorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: authorKeys.author(authorId) });
    },
  });
  const unfollow = useMutation({
    mutationFn: () => authors.unfollow(authorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: authorKeys.author(authorId) });
    },
  });

  return (
    <Button
      variant="contained"
      onClick={() => (isFollowing ? unfollow.mutate() : follow.mutate())}
      disabled={follow.isPending || unfollow.isPending}
      sx={{ bgcolor: buttonBgColorHex, color: buttonTextColorHex, '&:hover': { bgcolor: buttonBgColorHex } }}
    >
      {isFollowing ? "Unfollow author" : "Follow author"}
    </Button>
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
function getGallerySlotIndex(url: string): number {
  try {
    const g = new URL(url).searchParams.get("g");
    const m = g ? /^gallery(\d+)$/.exec(g) : null;
    if (m) return parseInt(m[1]!, 10);
  } catch {}
  return 999;
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

function LayoutBlockRenderer({ block, buttonBgColorHex, foregroundTextColorHex, frameWidth, frameHeight }: { block: LayoutBlock; buttonBgColorHex: string; foregroundTextColorHex: string; frameWidth?: number; frameHeight?: number }) {
  const { novel } = useNovel();
  if (!novel) return null;
  switch (block.type) {
    case "richText":
      { const content: unknown = (block as { type: 'richText'; content?: unknown }).content;
        const isDetails = !!(content && typeof content === 'object' && (content as { source?: string }).source === 'details');
        if (isDetails) {
          const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
          const snippet = (novel as unknown as { snippet?: string | null }).snippet ?? null;
          if (rich) {
            return (
              <Box
                sx={{
                  color: 'text.primary',
                  '& p': { margin: '0 0 12px 0' },
                  '& p:last-child': { marginBottom: 0 },
                  // Ensure visually blank paragraphs still occupy space
                  '& p:empty::before': { content: "\"\\00A0\"" },
                  '& p:empty': { minHeight: '24px' },
                }}
              >
                <SanitizedHtml html={JSONToHtml(rich)} />
              </Box>
            );
          }
          if (typeof snippet === 'string' && snippet.trim().length > 0) {
            return (
              <Box sx={{ color: 'text.primary' }}>
                {snippet.split("\n").map((paragraph, idx) => (
                  <Typography key={`${idx}-${paragraph}`} variant="body1" color="text.secondary" sx={{ mb: 2, minHeight: 24 }}>
                    {paragraph.trim().length === 0 ? '\u00A0' : paragraph}
                  </Typography>
                ))}
              </Box>
            );
          }
          return null;
        }
        return <Box sx={{ color: 'text.primary' }}><SanitizedHtml html={JSONToHtml(content)} /></Box>; }
    case "gallery": {
      const items = (block as { type: 'gallery'; items?: string[] }).items;
      const hiddenIds = ((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds) ?? [];
      // Determine ordered gallery items: explicit order or default sorted order
      let ordered = [] as typeof novel.galleryItems;
      if (Array.isArray(items) && items.length > 0) {
        ordered = items
          .map((id) => novel.galleryItems.find((g) => g.id === id))
          .filter((x): x is NonNullable<typeof x> => !!x);
      } else {
        ordered = [...(novel.galleryItems ?? [])].sort((a, b) => {
          const sa = getGallerySlotIndex(a.imageUrl);
          const sb = getGallerySlotIndex(b.imageUrl);
          if (sa !== sb) return sa - sb;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      }
      const visibleOrdered = ordered.filter((gi) => !hiddenIds.includes(gi.id));
      if (visibleOrdered.length === 0) return null;
      const framed = typeof frameWidth === 'number' && frameWidth > 0 && typeof frameHeight === 'number' && frameHeight > 0;
      if (framed) {
        const GAP = 8;
        const columns = frameWidth! < 600 ? 1 : frameWidth! < 900 ? 2 : 3;
        const tileWidthFromWidth = Math.max(80, Math.floor((frameWidth! - (columns - 1) * GAP) / columns));
        const tileHeightCandidate = Math.round(tileWidthFromWidth * 3 / 4);
        const tileHeight = Math.max(40, Math.min(tileHeightCandidate, Math.floor(frameHeight!)));
        const tileWidth = Math.round(tileHeight * 4 / 3);
        return (
          <Box my={1} sx={{ display: 'flex', gap: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            {visibleOrdered.map((gi) => (
              <Box key={gi.id} sx={{ position: 'relative', flex: '0 0 auto', width: tileWidth, height: tileHeight, borderRadius: 1, overflow: 'hidden' }}>
                <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes={`${tileWidth}px`} style={{ objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        );
      }
      return (
        <Box my={4}
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
          }}
        >
          {visibleOrdered.map((gi) => (
            <Box key={gi.id} sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 1, overflow: 'hidden' }}>
              <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      );
    }
    case "image": {
      const id = (block as { type: 'image'; id: string }).id;
      const caption = (block as { type: 'image'; caption?: string }).caption;
      const item = novel.galleryItems.find((g) => g.id === id);
      return item ? (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 120, overflow: 'visible' }}>
          <SafeImage src={item.imageUrl} alt={caption ?? 'Image'} fill sizes="(max-width: 1200px) 100vw, 1200px" style={{ objectFit: 'contain', objectPosition: 'center', overflow: 'visible' }} />
          {caption ? (
            <Typography variant="caption" color="text.secondary">{caption}</Typography>
          ) : null}
        </Box>
      ) : null;
    }
    case "updates":
      return <Box my={2}><NovelUpdates /></Box>;
    case "ratings":
      return <Box my={4}><NovelRatingsList buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} /></Box>;
    case "ratingsList":
      return <Box my={2}><NovelRatingsList buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} /></Box>;
    case "comments":
      return <Box my={4}><NovelComments buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} /></Box>;
    default:
      return null;
  }
}

function isFramedLayout(layout: NovelLayout): boolean {
  return Array.isArray(layout.blocks) && layout.blocks.some((b) => (b as { frame?: unknown }).frame);
}

function FramedLayoutRenderer({ layout, buttonBgColorHex, foregroundTextColorHex, onOpenGallery }: { layout: NovelLayout; buttonBgColorHex: string; foregroundTextColorHex: string; onOpenGallery: (url: string) => void }) {
  const { novel } = useNovel();

  const freeBlocks = (Array.isArray(layout.blocks) ? layout.blocks : []).filter((b) => !isProtectedBlock(b));

  // Measure dynamic heights for blocks that should expand vertically (e.g., richText)
  const wrappersRef = useRef<(HTMLDivElement | null)[]>([]);
  const [measuredHeights, setMeasuredHeights] = useState<Record<number, number>>({});

  useLayoutEffect(() => {
    const measure = () => {
      const next: Record<number, number> = {};
      freeBlocks.forEach((block, idx) => {
        const type = (block as { type: string }).type;
        if (type === 'richText') {
          const el = wrappersRef.current[idx];
          if (el) next[idx] = el.scrollHeight;
        }
      });
      // Only update when changed to avoid render loops
      const prev = measuredHeights;
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      let changed = prevKeys.length !== nextKeys.length;
      if (!changed) {
        for (const k of nextKeys) {
          if (prev[Number(k)] !== next[Number(k)]) { changed = true; break; }
        }
      }
      if (changed) setMeasuredHeights(next);
    };
    measure();
    if (typeof window !== 'undefined') {
      const handler = () => measure();
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }
  }, [layout, freeBlocks, measuredHeights]);

  if (!novel) return null;

  const bottom = freeBlocks.reduce((acc, b, idx) => {
    const f = (b as { frame?: { x: number; y: number; width: number; height: number } }).frame;
    if (!f) return acc;
    const type = (b as { type: string }).type;
    const blockHeight = type === 'richText' ? (measuredHeights[idx] ?? (f.height || 0)) : (f.height || 0);
    return Math.max(acc, (f.y || 0) + blockHeight);
  }, 0);

  return (
    <>
      <Box sx={{ position: 'relative', height: freeBlocks.length === 0 ? 0 : Math.max(0, bottom), px: { xs: 2, sm: 3, md: 4 }, boxSizing: 'border-box', overflow: 'visible' }}>
        {freeBlocks.map((block, idx) => {
          const f = (block as { frame?: { x: number; y: number; width: number; height: number } }).frame;
          const left = Math.max(0, f?.x ?? 0);
          const top = Math.max(0, f?.y ?? 0);
          const w = Math.max(0, f?.width ?? 0);
          const h = Math.max(0, f?.height ?? 0);
          const type = (block as { type: string }).type;
          const style = f ? {
            position: 'absolute' as const,
            left,
            top,
            width: `min(${w}px, calc(100% - ${left}px))`,
            height: type === 'richText' ? 'auto' : h,
            overflow: type === 'image' || type === 'richText' ? 'visible' : 'hidden'
          } : {};
          return (
            <Box key={`free-${idx}`} ref={(el: HTMLDivElement | null) => { if (wrappersRef.current[idx] !== el) { wrappersRef.current[idx] = el; } }} sx={style}>
              <LayoutBlockRenderer block={block} buttonBgColorHex={buttonBgColorHex} foregroundTextColorHex={foregroundTextColorHex} frameWidth={w} frameHeight={h} />
            </Box>
          );
        })}
      </Box>
      <Stack gap={3} sx={{ mt: 2, width: '100%' }}>
        {(() => {
          const compactGallery = ((novel as unknown as { pageLayout?: { settings?: { compactGallery?: boolean } } | null }).pageLayout?.settings?.compactGallery) === true;
          // Always render default gallery (respects hidden IDs) above updates
          const hiddenIds = ((novel as unknown as { pageLayout?: { settings?: { hiddenGalleryItemIds?: string[] } } | null }).pageLayout?.settings?.hiddenGalleryItemIds) ?? [];
          const ordered = [...(novel.galleryItems ?? [])].sort((a, b) => {
            const sa = getGallerySlotIndex(a.imageUrl);
            const sb = getGallerySlotIndex(b.imageUrl);
            if (sa !== sb) return sa - sb;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }).filter((gi) => !hiddenIds.includes(gi.id));
          if (ordered.length > 0) {
            if (compactGallery) {
              const tileHeight = 240;
              const tileWidth = Math.round(tileHeight * 4 / 3);
                return (
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                  {ordered.map((gi) => (
                      <Box key={gi.id} onClick={() => onOpenGallery && onOpenGallery(gi.imageUrl)} sx={{ position: 'relative', flex: '0 0 auto', width: tileWidth, height: tileHeight, borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                      <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes={`${tileWidth}px`} style={{ objectFit: 'cover' }} />
                    </Box>
                  ))}
                </Box>
              );
            } else {
                return (
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                  {ordered.map((gi) => (
                      <Box key={gi.id} onClick={() => onOpenGallery && onOpenGallery(gi.imageUrl)} sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                      <SafeImage src={gi.imageUrl} alt={gi.footer ?? 'Gallery image'} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
                    </Box>
                  ))}
                </Box>
              );
            }
          }
          return null;
        })()}
        <NovelUpdates />
        <NovelRatingsList buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
        <NovelComments buttonBgColor={buttonBgColorHex} buttonTextColor={foregroundTextColorHex} />
      </Stack>
      {/* Gallery fullscreen preview */}
    </>
  );
}

function isProtectedBlock(b: LayoutBlock): boolean {
  return b.type === 'updates' || b.type === 'ratingsList' || b.type === 'comments';
}
