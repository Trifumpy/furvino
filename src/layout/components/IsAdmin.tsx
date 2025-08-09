"use client";

import { useUser } from "@/users/providers";
import { PropsWithChildren } from "react";

export function IsAdmin({ children }: PropsWithChildren) {
  const { isAdmin } = useUser();

  if (!isAdmin) return null;

  return children;
}
