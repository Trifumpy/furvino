"use client";

import { AdminGuardClient } from "../../AdminGuardClient";
import { ImportFromItchForm } from "@/novels/pages/management/components";
import { Stack } from "@mui/material";

export default function Page() {
  return (
    <AdminGuardClient>
      <Stack gap={2}>
        <ImportFromItchForm />
      </Stack>
    </AdminGuardClient>
  );
}


