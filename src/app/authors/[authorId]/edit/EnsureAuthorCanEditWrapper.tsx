"use client";

import { ErrorPage, LoadingPage } from "@/generic/pages";
import { useAuthor } from "@/users/providers";
import { useUser } from "@/users/providers";

export function EnsureAuthorCanEditWrapper({ children }: { children: React.ReactNode }) {
  const { author } = useAuthor();
  const { user, isAdmin } = useUser();

  if (!author) {
    return <LoadingPage title="Loading Author Data..." />;
  }

  // If user context hasn't loaded yet, avoid showing a 403 flash
  if (user === undefined) {
    return <LoadingPage title="Loading User..." />;
  }

  const isOwner = user?.authorId === author.id;
  const canEdit = Boolean(isOwner || isAdmin);

  if (!canEdit) {
    return (
      <ErrorPage
        statusCode={403}
        message="You do not have permission to edit this author."
      />
    );
  }

  return <>{children}</>;
}


