"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRegistry } from "@/utils/client";
import { toast } from "react-toastify";
import { useUser } from "@/users/providers";
import { useRouter } from "next/navigation";

export default function BecomeAuthorPage() {
  const { authors } = useRegistry();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  // If the user already has an author profile, redirect to it
  useEffect(() => {
    if (user?.authorId) {
      router.replace(`/authors/${user.authorId}`);
    }
  }, [user?.authorId, router]);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await authors.updateMe({ name });
      toast.success("Author profile created");
      // Force a full page reload to reflect new author state (same as F5)
      window.location.reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("409")) {
        toast.error("Author with this name already exists");
      } else {
        toast.error("Failed to create author profile");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSubmit();
      }}
    >
      <Stack gap={2} sx={{ maxWidth: 480, m: "0 auto" }}>
        <Typography variant="h5">Become an author</Typography>
        <TextField
          label="Author name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={async (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              await handleSubmit();
            }
          }}
          autoFocus
          fullWidth
        />
        <Button type="submit" disabled={saving || !name.trim()} variant="contained">
          {saving ? "Creating..." : "Create author profile"}
        </Button>
      </Stack>
    </form>
  );
}


