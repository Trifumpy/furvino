import { CreateAuthorBody, PublicAuthor } from "@/contracts/users";
import { authorKeys, useRegistry } from "@/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateAuthor() {
  const { authors } = useRegistry();
  const client = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["createAuthor"],
    mutationFn: async (data: CreateAuthorBody) => {
      return await authors.createAuthor(data);
    },
    onError: (error) => {
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
