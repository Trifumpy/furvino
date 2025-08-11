"use client";

import { CreateAuthorSchema, PublicAuthor } from "@/contracts/users";
import { useModal } from "@/generic/hooks";
import { Selector, SelectorOption, SingleSelectorProps } from "@/generic/input";
import { Avatar } from "@/users/components";
import { useSearchAuthors } from "@/users/hooks";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AuthorCreationModal } from "./AuthorCreationModal";
import { authorKeys } from "@/utils/client";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAuthor } from "@/users/providers/hooks/useGetAuthor";

const MAX_AUTHORS = 25;

type Props = Omit<SingleSelectorProps<PublicAuthor>, "options">;

export function AuthorInput({ value, onChange, ...props }: Props) {
  const { authors, fetching, onSearch, addAuthor } = useSearchAuthors();
  const [query, setQuery] = useState("");

  const [initialModalValues, setInitialModalValues] = useState<
    CreateAuthorSchema | undefined
  >(undefined);

  const creationModal = useModal();

  const handleInput = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const options: SelectorOption<PublicAuthor>[] = useMemo(() => {
    const options = authors
      .slice(0, MAX_AUTHORS)
      .map((author) => buildAuthorOption(author, false));
    if (value && !options.some((o) => o.value.id === value.id)) {
      options.unshift(buildAuthorOption(value, true));
    }
    if (query.length > 0 && !options.some((o) => o.value.name === query)) {
      options.push({
        label: `Add "${query}"`,
        value: {
          id: "",
          name: query,
          user: null,
        },
        Icon: PlusIcon,
      });
    }
    return options;
  }, [authors, query, value]);

  const handleSelection = useCallback(
    (author: PublicAuthor | null) => {
      if (!author) {
        onChange(null);
        return;
      }

      if (author.id === "") {
        setQuery("");
        setInitialModalValues(author);
        const openModal = creationModal.open;
        openModal();
        return;
      } else {
        onChange(author);
      }

      onChange(author);
    },
    [creationModal.open, onChange]
  );

  return (
    <>
      <Selector<PublicAuthor>
        options={options}
        label="Author"
        multiple={false}
        hideSelected
        onChange={handleSelection}
        value={value}
        inputValue={query}
        loading={fetching}
        onInputChange={(_, v) => handleInput(v)}
        {...props}
      />
      <AuthorCreationModal
        {...creationModal}
        initialValues={initialModalValues}
        onCreate={(author) => {
          onChange(author);
          addAuthor(author);
          setQuery("");
        }}
      />
    </>
  );
}

function buildAuthorOption(
  author: PublicAuthor,
  hidden?: boolean
): SelectorOption<PublicAuthor> {
  return {
    label: author.name,
    value: author,
    hidden: hidden,
    Icon: ({ size = 24 }) => (
      <Avatar fallbackName={author.name} user={author.user} size={size} />
    ),
  };
}

type IdBasedProps = Omit<Props, "value" | "onChange"> & {
  value?: string | null;
  onChange?: (id: string | null) => void | Promise<void>;
};

export function AuthorInputById({ value, onChange, ...props }: IdBasedProps) {
  const queryClient = useQueryClient();
  const { data: authorData } = useGetAuthor(value ?? "");

  const selectedAuthor = useMemo(() => {
    if (!value) {
      return null;
    }
    if (authorData && authorData.id === value) {
      return authorData;
    }
    return {
      id: value,
      name: "Loading...",
      user: null,
    };
  }, [authorData, value]);

  const handleChange = (author: PublicAuthor | null) => {
    if (author) {
      queryClient.setQueryData(authorKeys.author(author.id), author);
    }

    if (onChange && author !== value) {
      onChange(author?.id ?? null);
    }
  };

  return (
    <AuthorInput value={selectedAuthor} onChange={handleChange} {...props} />
  );
}
