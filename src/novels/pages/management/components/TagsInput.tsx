import { Tag, TAGS } from "@/generic/data";
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
};

export function TagsInput({ value, onChange, ...props }: Props) {
  const [query, setQuery] = useState("");
  const handleChange = (newValue: TagWithId[]) => {
    onChange(newValue.map((v) => v.id));
  };

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
      renderValue={(selection, getItemProps) =>
        selection.map((item, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <NovelTag key={key} {...itemProps} tag={item.value.id} />;
        })
      }
      label="Tags"
      OptionRenderer={({ item }) => (
        <OptionRendererWithIcon key={item.value.id} item={item}>
          <NovelTag tag={item.value.id} />
        </OptionRendererWithIcon>
      )}
      {...props}
    />
  );
}
