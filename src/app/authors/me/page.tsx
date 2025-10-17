"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { PlusIcon, PencilIcon, SquareUserRoundIcon, BookUser as BookUserIcon } from "lucide-react";
import { AuthorGuardClient, useUser } from "@/users/providers";
import { useEffect, useRef, useState } from "react";
import { useRegistry } from "@/utils/client";
import { toast } from "react-toastify";

export default function MyAuthorPanel() {
  const { user } = useUser();
  const { authors } = useRegistry();
  const authorId = user?.authorId;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!confirmOpen) {
      setCountdown(5);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [confirmOpen]);

  async function handleDeleteAuthor() {
    try {
      await authors.deleteMe();
      toast.success("Author account deleted");
      // Reload to reflect loss of author state
      window.location.href = "/";
    } catch {
      toast.error("Failed to delete author account");
    }
  }
  return (
    <AuthorGuardClient>
      <Stack gap={2}>
        <Stack direction="row" gap={1} alignItems="center">
          <BookUserIcon />
          <Typography variant="h5">Author menu</Typography>
        </Stack>
        <Stack direction="row" gap={2}>
          <Button LinkComponent={Link} href="/authors/novels/new" variant="outlined" startIcon={<PlusIcon /> }>
            Create Novel
          </Button>
          <Button
            LinkComponent={Link}
            href={authorId ? `/authors/${authorId}` : "#"}
            variant="outlined"
            startIcon={<SquareUserRoundIcon /> }
            disabled={!authorId}
          >
            View My Author Page
          </Button>
          <Button
            LinkComponent={Link}
            href={authorId ? `/authors/${authorId}/edit` : "#"}
            variant="outlined"
            startIcon={<PencilIcon />}
            disabled={!authorId}
          >
            Edit Author
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={!authorId}
            onClick={() => setConfirmOpen(true)}
          >
            Delete Author Account
          </Button>
        </Stack>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Delete Author Account</DialogTitle>
          <DialogContent>
            This will permanently delete your author account and associated novels.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button color="error" disabled={countdown > 0} onClick={handleDeleteAuthor}>
              {countdown > 0 ? `Confirm in ${countdown}s` : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </AuthorGuardClient>
  );
}


