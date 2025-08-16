"use client";

import { Alert, Box, Button, CircularProgress, Grid, IconButton, Stack, Switch, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRegistry } from "@/utils/client";
import { NovelCard } from "@/novels/components/NovelCard";
import { useMemo, useState } from "react";
import { PencilIcon, Trash2Icon, XIcon, CheckIcon } from "lucide-react";
import { Modal, ModalActions, ModalContent, ModalTitle } from "@/generic/input";
import { toast } from "react-toastify";

export default function Page() {
  const params = useParams<{ collectionId: string }>();
  const collectionId = params?.collectionId as string;
  const { collections } = useRegistry();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => collections.getCollection(collectionId),
    enabled: !!collectionId,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const canSave = useMemo(() => {
    if (!isEditing) return false;
    return (
      name.trim() !== (data?.name ?? "") ||
      (description ?? "") !== (data?.description ?? "") ||
      isPublic !== (data?.isPublic ?? false)
    );
  }, [isEditing, name, description, isPublic, data]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">Failed to load collection.</Alert>;
  }
  if (!data) {
    return <Alert severity="warning">Collection not found.</Alert>;
  }

  const startEdit = () => {
    setName(data.name);
    setDescription(data.description ?? "");
    setIsPublic(Boolean(data.isPublic));
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setName("");
    setDescription("");
  };
  const saveEdit = async () => {
    await collections.updateCollection(collectionId, { name, description, isPublic });
    setIsEditing(false);
    await refetch();
  };

  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {isEditing ? (
          <Stack gap={1} sx={{ width: "100%" }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" />
            <Stack direction="row" alignItems="center" gap={1}>
              <Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <Typography variant="body2">Make collection public</Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack gap={1} sx={{ width: "100%" }}>
            <Typography variant="h4" component="h1">
              {data.name}
            </Typography>
            {data.description && (
              <Typography variant="body1" color="text.secondary">
                {data.description}
              </Typography>
            )}
          </Stack>
        )}
        <Stack direction="row" gap={1} sx={{ ml: 2, whiteSpace: "nowrap" }}>
          {isEditing ? (
            <>
              <Button onClick={cancelEdit} startIcon={<XIcon size={14} />}>Cancel</Button>
              <Button onClick={saveEdit} disabled={!canSave} startIcon={<CheckIcon size={14} />}>Save</Button>
            </>
          ) : (
            <>
              {data.isOwner ? (
                <Stack direction="row" gap={1}>
                  <Button variant="outlined" onClick={startEdit}>EDIT</Button>
                  <Button variant="outlined" color="error" onClick={() => setConfirmDeleteOpen(true)}>
                    DELETE COLLECTION
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" gap={1}>
                  <Button variant="outlined" onClick={async () => {
                    await collections.duplicate(collectionId);
                    toast.success("Collection duplicated");
                    await refetch();
                  }}>Duplicate</Button>
                  {data.isFollowing ? (
                    <Button variant="outlined" color="error" onClick={async () => {
                      await collections.unfollow(collectionId);
                      toast.success("Unfollowed collection");
                      await refetch();
                    }}>UNFOLLOW</Button>
                  ) : (
                    <Button variant="outlined" onClick={async () => {
                      await collections.follow(collectionId);
                      toast.success("Following collection");
                      await refetch();
                    }}>FOLLOW</Button>
                  )}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Stack>

      {data.novels.length > 0 ? (
        <Grid container spacing={4}>
          {data.novels.map((novel) => (
            <Grid key={novel.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Stack position="relative">
                <NovelCard
                  novel={novel}
                  isFavorited={false}
                  onToggleFavorite={() => {}}
                  disableLink={isEditing}
                />
                {isEditing && (
                  <IconButton
                    aria-label="Remove from collection"
                    size="medium"
                    color="error"
                    onClick={async () => {
                      await collections.removeNovel(collectionId, novel.id);
                      await refetch();
                    }}
                    sx={{ position: "absolute", top: 8, right: 8, bgcolor: "background.paper" }}
                  >
                    <Trash2Icon size={24} />
                  </IconButton>
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">This collection is empty.</Alert>
      )}
      <Modal
        isOpen={confirmDeleteOpen}
        close={() => setConfirmDeleteOpen(false)}
        onSubmit={async () => {
          await collections.deleteCollection(collectionId);
          setConfirmDeleteOpen(false);
          location.href = "/collections";
        }}
      >
        <ModalTitle>Delete collection?</ModalTitle>
        <ModalContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </ModalContent>
        <ModalActions close={() => setConfirmDeleteOpen(false)} submitAction="Delete" cancelColor="primary" submitColor="error" placeCancelAfterSubmit />
      </Modal>
    </Stack>
  );
}


