import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { IsAdmin } from ".";
import { IconButton, Stack } from "@mui/material";
import Link from "next/link";
import { WrenchIcon } from "lucide-react";

export function Auth() {
  return (
    <Stack direction="row" gap={2} alignItems="center">
      <IsAdmin>
        <IconButton LinkComponent={Link} href="/admin" color="inherit">
          <WrenchIcon />
        </IconButton>
      </IsAdmin>
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </Stack>
  );
}
