import { WithId } from "@/app/types";
import {
  Checkbox,
  FormControl,
  FormControlProps,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { LucideIcon } from "lucide-react";
import { FC, ReactNode, useMemo } from "react";
import { usePopover } from "../hooks";
import { generateId } from "@/utils/random";

export type SelectorOption<T extends WithId> = {
  label: string;
  value: T;
  keepOpen?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  Icon?: LucideIcon;
};
export type ValueRenderer<T extends WithId> = FC<ValueRendererProps<T>>;
export type ValueRendererProps<T extends WithId> = {
  item: SelectorOption<T>;
};

export type SingleSelectorProps<T extends WithId> = {
  value: T | null;
  multiple?: false;
  onChange: (value: T | null) => void | Promise<void>;
} & BaseSelectorProps<T>;
export type MultipleSelectorProps<T extends WithId> = {
  value: T[];
  multiple: true;
  onChange: (value: T[]) => void | Promise<void>;
} & BaseSelectorProps<T>;
export type BaseSelectorProps<T extends WithId> = {
  options: SelectorOption<T>[];
  label?: string;
  disabled?: boolean;
  hideSelected?: boolean;
  OptionRenderer?: OptionRenderer<T>;
  ValueRenderer?: ValueRenderer<T>;
  placeholder: ReactNode;
  slots?: {
    selectorHeader?: ReactNode;
    selectorFooter?: ReactNode;
  };
  sx?: FormControlProps["sx"];
};

// We can't immediately destructure `props` because we rely on the discriminated union
export function Selector<T extends WithId>({
  options,
  label,
  disabled = false,
  hideSelected = false,
  OptionRenderer = DefaultOptionRenderer,
  ValueRenderer = DefaultValueRenderer,
  slots = {},
  sx,
  ...props
}: SingleSelectorProps<T> | MultipleSelectorProps<T>) {
  const selectedSet = useMemo(
    () =>
      new Set(
        props.multiple
          ? props.value.map((v) => v.id)
          : props.value
            ? [props.value.id]
            : []
      ),
    [props.multiple, props.value]
  );
  const optionIndex = useMemo(() => {
    const index: Record<string | number, SelectorOption<T>> = {};
    options.forEach((option) => {
      index[option.value.id] = option;
    });
    return index;
  }, [options]);

  const handleSelect = async (id: string | number) => {
    const option = optionIndex[id];
    if (disabled || option.disabled) return;

    if (selectedSet.has(option.value.id)) {
      // Deselect the option
      if (props.multiple) {
        await props.onChange(
          props.value.filter((v) => v.id !== option.value.id)
        );
      } else {
        await props.onChange(null);
      }
    } else {
      // Select the option
      if (props.multiple) {
        await props.onChange([...props.value, option.value]);
      } else {
        await props.onChange(option.value);
      }
    }
  };

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value.id)),
    [options, selectedSet]
  );
  const visibleOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          !option.hidden && (!hideSelected || !selectedSet.has(option.value.id))
      ),
    [options, hideSelected, selectedSet]
  );

  const popover = usePopover<HTMLButtonElement>();
  const id = useMemo(() => generateId("selector-label"), []);

  return (
    <FormControl sx={sx}>
      <InputLabel id={id} disabled={disabled}>
        {label}
      </InputLabel>
      <Select
        ref={popover.ref}
        onClick={popover.open}
        disabled={disabled}
        value={(props.value ?? "") as T}
        multiple={props.multiple}
        renderValue={() => (
          <Stack direction="row" gap={1} flexWrap={"wrap"}>
            {selectedOptions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                {props.placeholder}
              </Typography>
            ) : (
              selectedOptions.map((option) => (
                <ValueRenderer key={option.value.id} item={option} />
              ))
            )}
          </Stack>
        )}
        onChange={(e) => console.log("selected value", e.target.value)}
      >
        <Stack direction="column" spacing={1}>
          {slots.selectorHeader}
          {visibleOptions.map((option) => (
            <MenuItem
              key={option.value.id}
              value={option.value.id}
              disabled={disabled || option.disabled}
              onClick={(event) => {
                handleSelect(option.value.id);
                if (option.keepOpen) {
                  event.preventDefault();
                }
              }}
            >
              <OptionRenderer
                key={option.value.id}
                item={option}
                selected={selectedSet.has(option.value.id)}
                select={() => handleSelect(option.value.id)}
                multiple={!!props.multiple}
                disabled={disabled || option.disabled}
              />
            </MenuItem>
          ))}
          {slots.selectorFooter}
        </Stack>
      </Select>
    </FormControl>
  );
}

export type OptionRenderer<T extends WithId> = FC<OptionRendererProps<T>>;
export type OptionRendererProps<T extends WithId> = {
  item: SelectorOption<T>;
  selected: boolean;
  select: () => void;
  multiple: boolean;
  disabled?: boolean;
};

function DefaultOptionRenderer<T extends WithId>({
  item,
  selected,
  select,
  disabled,
  multiple,
}: OptionRendererProps<T>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      onClick={select}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {multiple && (
        <Checkbox onChange={select} checked={selected} disabled={disabled} />
      )}
      {item.Icon && <item.Icon size={16} />}
      <Typography variant="body2">{item.label}</Typography>
    </Stack>
  );
}

function DefaultValueRenderer<T extends WithId>({
  item,
}: ValueRendererProps<T>) {
  return <Typography variant="body2">{item.label}</Typography>;
}
