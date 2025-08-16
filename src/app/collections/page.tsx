"use client";

import { Alert, Grid, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { collectionKeys, useRegistry } from "@/utils/client";
import Link from "next/link";
import { useUser } from "@/users/providers";

export default function Page() {
  const { collections } = useRegistry();
  const { user } = useUser();
  const { data, isLoading } = useQuery({
    queryKey: collectionKeys.mine(),
    queryFn: () => collections.getMyCollections(),
    enabled: !!user,
  });

  const owned = (data ?? []).filter((c) => !c.isFollowing);
  const followed = (data ?? []).filter((c) => c.isFollowing);

  return (
    <Stack gap={2}>
      <Typography variant="h4" component="h1" sx={{ my: 2 }}>
        Collections
      </Typography>
      {!user && (
        <Alert severity="info">You need to sign in to use collections.</Alert>
      )}
      {user && isLoading && <Alert severity="info">Loading collections…</Alert>}
      {user && !isLoading && (data?.length ?? 0) === 0 && (
        <Alert severity="info">You don&apos;t have any collections yet.</Alert>
      )}

      {user && owned.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">My Collections</Typography>
          <Grid container spacing={2}>
            {owned.map((c) => (
              <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack
                  component={Link}
                  href={`/collections/${c.id}`}
                  border={1}
                  borderColor="divider"
                  borderRadius={2}
                  p={2}
                  gap={1}
                  sx={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "background-color .15s ease", "&:hover": { backgroundColor: "action.hover" } }}
                >
                  <Typography variant="h6">{c.name}</Typography>
                  {c.description && (
                    <Typography variant="body2" color="text.secondary">
                      {c.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {c.itemsCount} item{c.itemsCount === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}

      {user && followed.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Followed Collections</Typography>
          <Grid container spacing={2}>
            {followed.map((c) => (
              <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack
                  component={Link}
                  href={`/collections/${c.id}`}
                  border={1}
                  borderColor="divider"
                  borderRadius={2}
                  p={2}
                  gap={1}
                  sx={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "background-color .15s ease", "&:hover": { backgroundColor: "action.hover" } }}
                >
                  <Typography variant="h6">{c.name}</Typography>
                  {c.description && (
                    <Typography variant="body2" color="text.secondary">
                      {c.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {c.itemsCount} item{c.itemsCount === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}


