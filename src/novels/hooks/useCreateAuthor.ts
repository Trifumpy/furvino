import { CreateAuthorBody, PublicAuthor } from "@/contracts/users";
import { authorKeys, useRegistry } from "@/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HttpServiceError } from "@/utils/services/core/HttpService";
import { toast } from "react-toastify";

export function useCreateAuthor() {
  const { authors } = useRegistry();
  const client = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["createAuthor"],
    mutationFn: async (data: CreateAuthorBody) => {
      return await authors.createAuthor(data);
    },
    onError: (error) => {
      if (error instanceof HttpServiceError && error.status === 403) {
        toast.error("You have been restricted by the admins to perform this action");
        return;
      }
      console.error("Error creating author:", error);
    },
    onSuccess: (newAuthor) => {
      client.setQueryData(authorKeys.all, (oldAuthors: PublicAuthor[]) => {
        if (!oldAuthors) return undefined;
        return [...oldAuthors, newAuthor];
      });
    }
  });

  return { createAuthor: mutation.mutateAsync, isCreating: mutation.isPending };
}
