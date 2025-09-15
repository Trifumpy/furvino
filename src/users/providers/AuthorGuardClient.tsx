"use client";

import { ErrorPage } from "@/generic/pages";
import { PropsWithChildren } from "react";
import { useUser } from ".";

export function AuthorGuardClient({ children }: PropsWithChildren) {
  const { user, isAdmin } = useUser();
  const isAuthor = Boolean(user?.authorId);
  const canAccess = Boolean(isAdmin || isAuthor);

  if (!canAccess) {
    return <ErrorPage statusCode={403} message="Admins or authors only" />;
  }

  return <>{children}</>;
}


