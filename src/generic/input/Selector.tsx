import { WithId } from "@/app/types";
import {
  Autocomplete,
  AutocompleteProps,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import { LucideProps } from "lucide-react";
import { FC, PropsWithChildren, ReactNode, useCallback, useMemo } from "react";

export type SelectorOption<T extends WithId> = {
  label: string;
  value: T;
  keepOpen?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  Icon?: FC<LucideProps>;
};

type SingleSelectorControls<T extends WithId> = {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void | Promise<void>;
};
type MultiSelectorControls<T extends WithId> = {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void | Promise<void>;
};
type OverriddenKey =
  | "onChange"
  | "value"
  | "multiple"
  | "renderInput"
  | "renderOption"
  | "renderTags"
  | "filterSelectedOptions";

export type SingleSelectorProps<T extends WithId> = BaseSelectorProps<T> &
  SingleSelectorControls<T> &
  Omit<
    AutocompleteProps<SelectorOption<T>, false, false, false>,
    OverriddenKey
  >;
export type MultiSelectorProps<T extends WithId> = BaseSelectorProps<T> &
  MultiSelectorControls<T> &
  Omit<AutocompleteProps<SelectorOption<T>, true, false, false>, OverriddenKey>;
export type BaseSelectorProps<T extends WithId> = {
  options: SelectorOption<T>[];
  label?: string;
  disabled?: boolean;
  hideSelected?: boolean;
  OptionRenderer?: OptionRenderer<T>;
  placeholder?: string;
  variant?: TextFieldProps["variant"];
  error?: ReactNode;
  loading?: boolean;
};

// We can't immediately destructure `props` because we rely on the discriminated union
export function Selector<T extends WithId>({
  options,
  label,
  disabled = false,
  hideSelected = false,
  OptionRenderer = DefaultOptionRenderer,
  placeholder,
  loading,
  error,
  value,
  variant,
  multiple,
  onChange,
  ...props
}: SingleSelectorProps<T> | MultiSelectorProps<T>) {
  const control = useMemo(
    () =>
      ({
        multiple,
        value,
        onChange,
      }) as SingleSelectorControls<T> | MultiSelectorControls<T>,
    [multiple, value, onChange]
  );

  const selectedSet = useMemo(
    () =>
      new Set(
        control.multiple
          ? control.value.map((v) => v.id)
          : control.value
            ? [control.value.id]
            : []
      ),
    [control.multiple, control.value]
  );

  const handleSelect = useCallback(
    (option: SelectorOption<T> | SelectorOption<T>[] | null) => {
      if (control.multiple) {
        const newValues = Array.isArray(option) ? option : [option];
        control.onChange(
          newValues.filter((v) => v !== null).map((v) => v.value)
        );
      } else {
        const singleOption = Array.isArray(option)
          ? option.length > 0
            ? option[0]
            : null
          : option;
        control.onChange(singleOption?.value ?? null);
      }
    },
    [control]
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value.id)),
    [options, selectedSet]
  );
  const visibleOptions = useMemo(() => {
    return options.filter((option) => !option.hidden);
  }, [options]);

  const commonProps = {
    disabled,
    options: visibleOptions,
    filterSelectedOptions: hideSelected,
    getOptionLabel: (option) => option.label,
    isOptionEqualToValue: (option, { value }) => option.value.id === value.id,
    renderInput: (inputProps) => (
      <TextField
        label={label}
        placeholder={placeholder}
        error={!!error}
        helperText={error}
        variant={variant}
        {...inputProps}
      />
    ),
    onChange: (_, value) => handleSelect(value),
    renderOption: ({ key, ...optionProps }, option_) => {
      const option = option_ as SelectorOption<T>;
      return (
        <li key={key} {...optionProps}>
          <OptionRenderer
            item={option}
            selected={selectedSet.has(option.value.id)}
            multiple={!!control.multiple}
            disabled={disabled || option.disabled}
          />
        </li>
      );
    },
  } satisfies AutocompleteProps<SelectorOption<T>, boolean, false, false>;

  if (control.multiple) {
    return (
      <Autocomplete
        {...commonProps}
        {...(props as AutocompleteProps<SelectorOption<T>, true, false, false>)}
        value={selectedOptions}
        multiple={true}
      />
    );
  }

  return (
    <Autocomplete
      {...commonProps}
      {...(props as AutocompleteProps<SelectorOption<T>, false, false, false>)}
      value={selectedOptions.length > 0 ? selectedOptions[0] : null}
      multiple={false}
    />
  );
}

export type OptionRenderer<T extends WithId> = FC<OptionRendererProps<T>>;
export type OptionRendererProps<T extends WithId> = {
  item: SelectorOption<T>;
  selected: boolean;
  multiple: boolean;
  disabled?: boolean;
};

function DefaultOptionRenderer<T extends WithId>({
  item,
  disabled,
}: OptionRendererProps<T>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {item.Icon && <item.Icon size={16} />}
      <Typography variant="body2">{item.label}</Typography>
    </Stack>
  );
}

export type OptionRendererWithIconProps<T extends WithId> = PropsWithChildren<{
  item: SelectorOption<T>;
  iconSize?: number;
  gap?: number;
}>;

export function OptionRendererWithIcon<T extends WithId>({
  item,
  iconSize = 16,
  gap = 1,
  children,
}: OptionRendererWithIconProps<T>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={gap}
      style={{ cursor: item.disabled ? "not-allowed" : "pointer" }}
    >
      {item.Icon && <item.Icon size={iconSize} />}
      {children}
    </Stack>
  );
}
