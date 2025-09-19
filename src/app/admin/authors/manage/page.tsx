"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { AdminGuardClient } from "../../AdminGuardClient";
import { useRegistry } from "@/utils/client";
import { useSearchAuthors } from "@/users/hooks";
import { useSearchUsers } from "@/novels/hooks";
import { PublicAuthor } from "@/contracts/users";
import { toast } from "react-toastify";
import Link from "next/link";

export default function ManageAuthorsPage() {
  const { authors } = useRegistry();
  const [selected, setSelected] = useState<PublicAuthor | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const { users: userResults, onSearch: onSearchUsers } = useSearchUsers();

  const { authors: foundAuthors, onSearch } = useSearchAuthors();

  useEffect(() => {
    onSearch(search);
  }, [search, onSearch]);

  useEffect(() => {
    onSearchUsers(userQuery);
  }, [userQuery, onSearchUsers]);

  useEffect(() => {
    setName(selected?.name ?? "");
  }, [selected]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await authors.updateAuthor(selected.id, { name });
      toast.success("Author updated");
    } catch {
      toast.error("Failed to update author");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const ok = window.confirm(`Are you sure you want to delete "${selected.name}" and all of their novels? This action cannot be undone.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await authors.deleteAuthor(selected.id as string);
      toast.success("Author deleted");
      setSelected(null);
      setName("");
      onSearch("");
    } catch {
      toast.error("Failed to delete author");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminGuardClient>
      <Stack gap={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">Manage Authors</Typography>
          <Button LinkComponent={Link} href="/admin/authors/new" variant="outlined">
            Create Author
          </Button>
        </Stack>
        <TextField label="Search authors" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type name" />
        <Stack direction="row" gap={1} flexWrap="wrap">
          {foundAuthors.map((a) => (
            <Button key={a.id} variant={selected?.id === a.id ? 'contained' : 'outlined'} onClick={() => setSelected(a)}>
              {a.name}
            </Button>
          ))}
        </Stack>
        {selected && (
          <Stack gap={2} sx={{ maxWidth: 480 }}>
            <TextField label="Author name" value={name} onChange={(e) => setName(e.target.value)} />
            <Typography variant="subtitle1">Assign/Change linked user</Typography>
            <TextField label="Search users or paste userId" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Type username or userId" />
            <Stack direction="row" gap={1} flexWrap="wrap">
              {userResults.map((u) => (
                <Button key={u.id} variant="outlined" onClick={async () => {
                  try {
                    await authors.linkAuthor(selected.id, u.id);
                    toast.success(`Linked to ${u.username}`);
                  } catch {
                    toast.error('Failed to link user');
                  }
                }}>{u.username}</Button>
              ))}
            </Stack>
            <Stack direction="row" gap={1}>
              <Button onClick={async () => {
                if (!userQuery.trim()) return;
                try {
                  await authors.linkAuthor(selected.id, userQuery.trim());
                  toast.success('Linked user');
                } catch {
                  toast.error('Failed to link user');
                }
              }}>Link by ID</Button>
            </Stack>
            <Stack direction="row" gap={1}>
              <Button onClick={handleSave} disabled={saving || !name.trim()} variant="contained">Save</Button>
              <Button onClick={handleDelete} color="error" disabled={deleting} variant="outlined">Delete</Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </AdminGuardClient>
  );
}


