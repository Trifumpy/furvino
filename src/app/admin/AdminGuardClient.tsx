"use client";

import { ErrorPage } from "@/generic/pages";
import { PropsWithChildren } from "react";
import { useUser } from "@/users/providers";

export function AdminGuardClient({ children }: PropsWithChildren) {
  const { isAdmin } = useUser();
  if (!isAdmin) return <ErrorPage statusCode={403} message="Admins only" />;
  return <>{children}</>;
}


