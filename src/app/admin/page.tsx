"use client";
import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { AdminGuardClient } from "./AdminGuardClient";
import { useState } from "react";
import { toast } from "react-toastify";

export default function AdminPanel() {
  const [sending, setSending] = useState(false);

  async function onSendTestEmail() {
    setSending(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send test email");
      toast.success("Test email sent to your account email");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send test email";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminGuardClient>
      <Stack gap={2}>
        <Typography variant="h5">Admin menu</Typography>
        <Stack direction="row" gap={2}>
          <Button LinkComponent={Link} href="/admin/novels/new" variant="outlined">
            Create Novel
          </Button>
          <Button LinkComponent={Link} href="/admin/novels/import-itch" variant="outlined">
            Import from Itch.io
          </Button>
          <Button LinkComponent={Link} href="/admin/authors/manage" variant="outlined">
            Manage Authors
          </Button>
          <Button LinkComponent={Link} href="/admin/users/manage" variant="outlined">
            Manage Users
          </Button>
          <Button onClick={onSendTestEmail} variant="contained" disabled={sending}>
            {sending ? "Sending…" : "Send Test Email"}
          </Button>
        </Stack>
      </Stack>
    </AdminGuardClient>
  );
}
