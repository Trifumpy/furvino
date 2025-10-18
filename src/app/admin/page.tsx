"use client";
import { Button, Stack, Typography, TextField } from "@mui/material";
import Link from "next/link";
import { AdminGuardClient } from "./AdminGuardClient";
import { useState } from "react";
import { toast } from "react-toastify";
import { Modal, ModalTitle, ModalContent, ModalActions } from "@/generic/input/Modal";
import { RichTextEditor } from "@/generic/input/RichTextEditor";
import { useModal } from "@/generic/hooks/useModal";

export default function AdminPanel() {
  const [sending, setSending] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const testEmailModal = useModal();

  async function onSendTestEmail(content?: string) {
    setSending(true);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send test email");
      toast.success("Test email sent to your account email");
      testEmailModal.close();
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
          <Button onClick={testEmailModal.open} variant="contained" disabled={sending}>
            {sending ? "Sending…" : "Send Test Email"}
          </Button>
        </Stack>
      </Stack>

      <Modal
        isOpen={testEmailModal.isOpen}
        close={testEmailModal.close}
        onSubmit={(e) => {
          e.preventDefault();
          onSendTestEmail(emailContent || undefined);
        }}
        maxWidth="md"
        fullWidth
      >
        <ModalTitle>Compose Test Email</ModalTitle>
        <ModalContent>
          <Stack gap={2}>
            <Typography variant="body2" color="text.secondary">
              Compose your test email content below. You can use rich text formatting.
            </Typography>
            <RichTextEditor
              value={emailContent}
              onChange={(doc, html) => setEmailContent(html)}
              placeholder="Enter your test email content..."
            />
          </Stack>
        </ModalContent>
        <ModalActions
          submitAction="Send Test Email"
          loading={sending}
          disabled={sending}
          close={testEmailModal.close}
        />
      </Modal>
    </AdminGuardClient>
  );
}
