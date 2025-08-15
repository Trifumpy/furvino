"use client";

import { ErrorPage, LoadingPage } from "@/generic/pages";
import { useNovel } from "@/novels/providers";

export function EnsureCanEditWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { novel, canEdit } = useNovel();

  if (!novel) {
    return <LoadingPage title="Loading Novel Data..." />;
  }

  if (!canEdit) {
    return (
      <ErrorPage
        statusCode={403}
        message="You do not have permission to edit this novel."
      />
    );
  }

  return <>{children}</>;
}
