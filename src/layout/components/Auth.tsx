"use client";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { IsAdmin } from ".";
import { Button, IconButton, Stack } from "@mui/material";
import Link from "next/link";
import { BookUserIcon, WrenchIcon } from "lucide-react";
import { useUser } from "@/users/providers";

export function Auth() {
  const { user } = useUser();
  return (
    <Stack direction="row" gap={1} alignItems="center">
      <IsAdmin>
        {
          <IconButton
            LinkComponent={Link}
            href="/admin"
            color="inherit"
            aria-label="Admin panel"
          >
            <WrenchIcon />
          </IconButton>
        }
      </IsAdmin>
      {user?.authorId && (
        <IconButton
          LinkComponent={Link}
          href="/authors/me"
          color="inherit"
          aria-label="Author panel"
        >
          <BookUserIcon />
        </IconButton>
      )}
      <SignedOut>
        <SignInButton mode="modal">
          <Button color="inherit">Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button color="inherit">Sign up</Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </Stack>
  );
}
