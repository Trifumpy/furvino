"use client";
import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { AdminGuardClient } from "./AdminGuardClient";

export default function AdminPanel() {
  return (
    <AdminGuardClient>
      <Stack gap={2}>
        <Typography variant="h5">Admin menu</Typography>
        <Stack direction="row" gap={2}>
          <Button LinkComponent={Link} href="/admin/novels/new" variant="outlined">
            Create Novel
          </Button>
          <Button LinkComponent={Link} href="/admin/authors/manage" variant="outlined">
            Manage Authors
          </Button>
        </Stack>
      </Stack>
    </AdminGuardClient>
  );
}
