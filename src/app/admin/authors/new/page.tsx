"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useRegistry } from "@/utils/client";
import { AdminGuardClient } from "../../AdminGuardClient";
import { toast } from "react-toastify";

export default function AdminCreateAuthorPage() {
  const { authors } = useRegistry();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await authors.createAuthor({ name });
      toast.success("Author created");
      setName("");
    } catch (e) {
      toast.error("Failed to create author");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuardClient>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await handleCreate();
        }}
      >
        <Stack gap={2} sx={{ maxWidth: 480, m: '0 auto' }}>
          <Typography variant="h5">Create Author</Typography>
          <TextField
            label="Author name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                await handleCreate();
              }
            }}
            autoFocus
          />
          <Button type="submit" disabled={saving || !name.trim()} variant="contained">
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </Stack>
      </form>
    </AdminGuardClient>
  );
}


