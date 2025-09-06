"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useNovel } from "../providers";
import { DEFAULT_NOVEL_COVER_URL } from "../components/constants";
import { Links } from "../components/Links";
import { NovelComments, NovelDownloads, NovelRatings, NovelRatingsList, NovelGallery } from "../components";
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
  const rich = (novel as unknown as { descriptionRich?: unknown | null }).descriptionRich;
  const hasRich = !!rich;
  const thumbnailUrl = novel.thumbnailUrl || DEFAULT_NOVEL_COVER_URL;

  return (
    <>
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
            <Typography variant="subtitle1" color="text.secondary">
              by {" "}
              <Link href={`/authors/${novel.author.id}`}>{novel.author.name}</Link>
            </Typography>
            <NovelDownloads novel={novel} />
            <Links novel={novel} />
            {user && (
              <Stack direction="row" gap={2}>
                <Button variant="outlined" onClick={() => setIsOpen(true)}>
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
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "4 / 3",
                objectFit: "cover",
              }}
            />
          </Box>
        </Stack>
        <NovelTags tags={novel.tags} chipSize="medium" />
      </Stack>
      {hasRich ? (
        <SanitizedHtml html={JSONToHtml(rich)} />
      ) : description ? (
        description.split("\n").map((paragraph) => (
          <Typography
            key={paragraph}
            variant="body1"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {paragraph}
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
      <Box my={4}>
        <NovelRatings />
      </Box>
      <Box my={2}>
        <NovelRatingsList />
      </Box>
      <Box my={4}>
        <NovelComments />
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
    </>
  );
}

function JSONToHtml(json: unknown): string {
  try {
    if (!json) return "";
    // Use TipTap server-side HTML generator to render a safe subset
    const html = generateHTML(json as never, [
      StarterKit.configure({ heading: { levels: [2,3,4] } }),
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      Underline,
      TiptapLink.configure({ protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ]);
    return html;
  } catch {
    return "";
  }
}
