"use client";

import { AdminGuardClient } from "../../AdminGuardClient";
import { Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRegistry } from "@/utils/client";
import { useSearchUsers } from "@/novels/hooks";
import { PublicUser } from "@/contracts/users";
import { toast } from "react-toastify";

export default function ManageUsersPage() {
  const { users } = useRegistry();
  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const { users: results, onSearch } = useSearchUsers();

  useEffect(() => {
    onSearch(search);
  }, [search, onSearch]);

  const displayed = useMemo(() => {
    if (!search.trim()) {
      return [...results]
        .sort((a, b) => new Date(b.createdAt as unknown as string).getTime() - new Date(a.createdAt as unknown as string).getTime())
        .slice(0, 20);
    }
    return results;
  }, [results, search]);

  async function updateModeration(patch: Partial<Pick<PublicUser, 'banCommentingAndRating' | 'banAuthorCreation'>>) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await users.updateModeration(selected.id, patch);
      setSelected(updated);
      toast.success('Updated moderation');
    } catch {
      toast.error('Failed to update moderation');
    } finally {
      setSaving(false);
    }
  }

  async function unassignAuthor() {
    if (!selected) return;
    setBusy(true);
    try {
      await users.unassignAuthor(selected.id);
      setSelected({ ...selected, authorId: null });
      toast.success('Author unassigned');
    } catch {
      toast.error('Failed to unassign');
    } finally {
      setBusy(false);
    }
  }

  async function unassignAndRemoveAuthor() {
    if (!selected) return;
    const ok = window.confirm('Unassign user and delete their Author (only if they have no novels)?');
    if (!ok) return;
    setBusy(true);
    try {
      await users.unassignAndRemoveAuthor(selected.id);
      setSelected({ ...selected, authorId: null });
      toast.success('Author removed');
    } catch {
      toast.error('Failed to remove author (ensure they have no novels)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuardClient>
      <Stack gap={3}>
        <Typography variant="h5">Manage Users</Typography>
        <TextField label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type username" />
        <Stack direction="row" gap={1} flexWrap="wrap">
          {displayed.map((u) => (
            <Button key={u.id} variant={selected?.id === u.id ? 'contained' : 'outlined'} onClick={() => setSelected(u)}>
              {u.username}
            </Button>
          ))}
        </Stack>
        {selected && (
          <Stack gap={2} sx={{ maxWidth: 520 }}>
            <Typography variant="subtitle1">User: {selected.username}</Typography>
            <Stack>
              <FormControlLabel
                control={<Checkbox
                  checked={!!selected.banCommentingAndRating}
                  onChange={async (e) => {
                    await updateModeration({ banCommentingAndRating: e.target.checked });
                  }}
                  disabled={saving}
                />}
                label="Ban commenting and rating"
              />
              <FormControlLabel
                control={<Checkbox
                  checked={!!selected.banAuthorCreation}
                  onChange={async (e) => {
                    await updateModeration({ banAuthorCreation: e.target.checked });
                  }}
                  disabled={saving}
                />}
                label="Ban author creation"
              />
            </Stack>
            <Stack direction="row" gap={1}>
              <Button onClick={unassignAuthor} disabled={busy || !selected.authorId} variant="outlined">Unassign author</Button>
              <Button onClick={unassignAndRemoveAuthor} color="error" disabled={busy || !selected.authorId} variant="outlined">Unassign + Remove author</Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </AdminGuardClient>
  );
}


