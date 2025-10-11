import { Tag, TAGS } from "@/generic/data";
import { Autocomplete, IconButton, Stack, TextField } from "@mui/material";
import {
  MultiSelectorProps,
  OptionRendererWithIcon,
  Selector,
  SelectorOption,
} from "@/generic/input";
import { NovelTag } from "@/novels/components";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

type TagWithId = {
  id: Tag | string;
};

type Props = Omit<
  MultiSelectorProps<TagWithId>,
  "onChange" | "value" | "options" | "multiple"
> & {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  noSuggestions?: boolean;
};

export function TagsInput({ value, onChange, label = "Tags", noSuggestions = false, ...props }: Props) {
  if (noSuggestions) {
    return (
      <FreeSoloTagsInput value={value} onChange={onChange} label={label} {...props} />
    );
  }
  return (
    <SourcedTagsInput value={value} onChange={onChange} label={label} {...props} />
  );
}

function FreeSoloTagsInput({ value, onChange, label, ...props }: Omit<Props, "noSuggestions">) {
  const freeSoloValue = useMemo(() => value, [value]);
  // Local input buffer to support explicit + button for mobile users
  const [buffer, setBuffer] = useState("");

  const commitTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const lower = tag.toLowerCase();
    const next = Array.from(new Set([...freeSoloValue.map((v) => v.toLowerCase()), lower]));
    onChange(next);
    setBuffer("");
  };

  return (
    <Stack direction="row" alignItems="stretch" gap={1}>
      <Autocomplete<string, true, false, true>
        multiple
        freeSolo
        options={[]}
        filterOptions={(x) => x}
        value={freeSoloValue}
        onChange={(_, newValue) => {
          const cleaned = (newValue || [])
            .map((v) => (typeof v === "string" ? v : String(v)))
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
          const dedup = Array.from(new Set(cleaned.map((v) => v.toLowerCase())));
          onChange(dedup);
        }}
        renderTags={(selected, getTagProps) =>
          selected.map((tag, index) => {
            const { key, ...chipProps } = getTagProps({ index });
            return <NovelTag key={key} {...chipProps} tag={tag} />;
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={!!props.error}
            helperText={props.error as string}
            variant={props.variant}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Preserve Enter behavior
                commitTag(buffer || (e.target as HTMLInputElement).value);
                // Prevent form submission in nested forms
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        )}
        forcePopupIcon={false}
        open={false}
        clearOnBlur
        selectOnFocus
        handleHomeEndKeys
        sx={{ flex: 1 }}
      />
      <IconButton
        aria-label="Add tag"
        onClick={() => commitTag(buffer)}
        disabled={!buffer.trim()}
        size="small"
        sx={{ alignSelf: "center" }}
      >
        <PlusIcon size={18} />
      </IconButton>
    </Stack>
  );
}

function SourcedTagsInput({ value, onChange, label, ...props }: Omit<Props, "noSuggestions">) {
  const [query, setQuery] = useState("");
  const options: SelectorOption<TagWithId>[] = useMemo(() => {
    const result = Object.entries(TAGS).map(
      ([tag, label]) =>
        ({
          value: { id: tag },
          label: label,
        }) as SelectorOption<TagWithId>
    );

    value.forEach((tag) => {
      if (!result.some((option) => option.value.id === tag)) {
        result.push({
          value: { id: tag },
          label: tag,
        });
      }
    });

    result.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

    if (
      query.length > 0 &&
      !result.some(
        (option) => option.value.id.toLowerCase() === query.toLowerCase()
      )
    ) {
      result.push({
        label: query,
        value: { id: query.toLowerCase() },
        Icon: PlusIcon,
      });
    }

    return result;
  }, [query, value]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value.id)),
    [options, selectedSet]
  );
  const selectedTags = useMemo(
    () => selectedOptions.map((option) => option.value),
    [selectedOptions]
  );

  const handleChange = (newValue: TagWithId[]) => {
    onChange(newValue.map((v) => v.id));
  };

  return (
    <Selector<TagWithId>
      multiple
      options={options}
      value={selectedTags}
      onChange={handleChange}
      hideSelected
      inputValue={query}
      onInputChange={(_, v, reason) => {
        if (reason === "reset") return;
        setQuery(v);
      }}
      autoHighlight
      openOnFocus
      selectOnFocus
      disableCloseOnSelect
      renderValue={(selection, getItemProps) =>
        selection.map((item, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <NovelTag key={key} {...itemProps} tag={item.value.id} />;
        })
      }
      label={label}
      OptionRenderer={({ item }) => (
        <OptionRendererWithIcon key={item.value.id} item={item}>
          <NovelTag tag={item.value.id} />
        </OptionRendererWithIcon>
      )}
      {...props}
    />
  );
}
