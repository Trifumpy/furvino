import { IconButton, Stack, TextField, Typography } from "@mui/material";
import { FC, ReactNode, useMemo } from "react";
import { Selector, SelectorOption, SingleSelectorProps } from "./Selector";
import { DeleteIcon, LucideIcon } from "lucide-react";

export type KeyMapKey<T extends string> = {
  label: string;
  value: T;
  Icon?: LucideIcon;
};

type Props<TKey extends string, TValue> = {
  keys: KeyMapKey<TKey>[];
  value: [TKey, TValue][];
  onChange: (newValue: [TKey, TValue][]) => void | Promise<void>;
  getDefaultValue?: (key: TKey) => TValue;
  errors?: Record<TKey, string>;
  ValueField: FC<ValueFieldProps<TKey, TValue>>;
  slotProps?: {
    fields?: FieldStyleProps;
    selector?: Partial<SingleSelectorProps<{ id: TKey }>>;
  };
};

const DEFAULT_MIN_KEY_WIDTH = 180;
export function KeyMapField<TKey extends string, TValue>({
  keys,
  value,
  errors,
  onChange,
  getDefaultValue = () => null as TValue,
  ValueField,
  slotProps = {},
}: Props<TKey, TValue>) {
  const removeKey = (key: TKey) => {
    const newValue = value.filter(([k]) => k !== key);
    onChange(newValue);
  };

  const addKey = (key: TKey) => {
    if (value.find(([k]) => k === key) === undefined) {
      const newValue = [
        ...value,
        [key, getDefaultValue(key)] as [TKey, TValue],
      ];
      onChange(newValue);
    }
  };

  const handleKeyChange = (key: TKey) => {
    return (newValue: TValue) => {
      const newValueArray = value.map(([k, v]) =>
        k === key ? [k, newValue] : [k, v]
      ) as [TKey, TValue][];
      onChange(newValueArray);
    };
  };

  const missingKeyOptions = useMemo(() => {
    const existingKeySet = new Set(value.map(([k]) => k));
    const missingKeys = keys.filter((key) => !existingKeySet.has(key.value));
    return missingKeys.map(
      (key) =>
        ({
          value: { id: key.value },
          label: key.label,
          Icon: key.Icon,
        }) satisfies SelectorOption<{ id: TKey }>
    );
  }, [keys, value]);

  const structuredData = useMemo(() => {
    const keyMap = new Map(keys.map((key) => [key.value, key]));
    return value
      .map(([key, value]) => ({
        keyItem: keyMap.get(key)!,
        value,
      }))
      .filter((v) => v.keyItem !== undefined);
  }, [keys, value]);

  return (
    <Stack gap={2}>
      {structuredData.map(({ keyItem, value }) => (
        <KeyValueField<TKey, TValue>
          key={keyItem.value}
          itemKey={keyItem}
          value={value}
          error={errors?.[keyItem.value]}
          onChange={handleKeyChange(keyItem.value)}
          onDelete={() => removeKey(keyItem.value)}
          ValueField={ValueField}
          {...slotProps.fields}
        />
      ))}
      {missingKeyOptions.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          All keys are set.
        </Typography>
      ) : (
        <KeyValueFieldFrame<TKey, TValue>
          label={
            <Selector<{ id: TKey }>
              options={missingKeyOptions}
              value={null}
              multiple={false}
              onChange={(selected) => {
                if (selected) {
                  addKey(selected.id);
                }
              }}
              sx={{
                minWidth:
                  slotProps.fields?.minKeyWidth || DEFAULT_MIN_KEY_WIDTH,
              }}
              placeholder="Add a key"
              {...slotProps.selector}
            />
          }
          value={getDefaultValue(missingKeyOptions[0].value.id)}
          ValueField={ValueField}
          disabled
        />
      )}
    </Stack>
  );
}

type FieldStyleProps = {
  minKeyWidth?: number | string;
};
type FieldProps<TKey extends string, TValue> = FieldStyleProps & {
  itemKey: KeyMapKey<TKey>;
  value: TValue;
  error: string | undefined;
  onChange: (newValue: TValue) => void | Promise<void>;
  onDelete: () => void;
  ValueField: FC<ValueFieldProps<TKey, TValue>>;
};

export function KeyValueField<TKey extends string, TValue>({
  itemKey,
  value,
  error,
  ValueField,
  onChange,
  onDelete,
  minKeyWidth = DEFAULT_MIN_KEY_WIDTH,
}: FieldProps<TKey, TValue>) {
  return (
    <KeyValueFieldFrame<TKey, TValue>
      itemKey={itemKey}
      value={value}
      error={error}
      onChange={onChange}
      onDelete={onDelete}
      ValueField={ValueField}
      label={
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          minWidth={minKeyWidth}
        >
          {itemKey.Icon && <itemKey.Icon size={20} />}
          <Typography variant="body1">{itemKey.label}</Typography>
        </Stack>
      }
    />
  );
}

type FrameProps<TKey extends string, TValue> = {
  itemKey?: KeyMapKey<TKey>;
  value: TValue;
  error?: string | undefined;
  onChange?: (newValue: TValue) => void | Promise<void>;
  onDelete?: () => void;
  ValueField: FC<ValueFieldProps<TKey, TValue>>;
  disabled?: boolean;
  label: ReactNode;
};

function KeyValueFieldFrame<TKey extends string, TValue>({
  itemKey,
  value,
  error,
  onChange,
  onDelete,
  ValueField,
  disabled = false,
  label,
}: FrameProps<TKey, TValue>) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      {label}
      <ValueField
        itemKey={"" as TKey}
        value={value}
        onChange={(...args) => onChange?.(...args)}
        error={error}
        disabled={disabled}
      />
      <IconButton
        color="error"
        onClick={onDelete}
        aria-label={`Delete ${itemKey?.label}`}
        disabled={disabled || !onDelete}
      >
        <DeleteIcon size={28} />
      </IconButton>
    </Stack>
  );
}

export type ValueFieldProps<TKey extends string, TValue> = {
  itemKey: TKey;
  value: TValue;
  error: string | undefined;
  disabled?: boolean;
  onChange: (newValue: TValue) => void | Promise<void>;
};

export function StringKeyMapField<TKey extends string>({
  keys,
  value,
  onChange,
  getDefaultValue,
  slotProps = {},
}: Omit<Props<TKey, string>, "ValueField">) {
  return (
    <>
      {JSON.stringify(value) /* Debugging output, can be removed later */}
      <KeyMapField<TKey, string>
        keys={keys}
        value={value}
        onChange={onChange}
        getDefaultValue={getDefaultValue}
        ValueField={StringValueField}
        slotProps={slotProps}
      />
    </>
  );
}

function StringValueField<TKey extends string>({
  value,
  error,
  onChange,
  disabled = false,
}: ValueFieldProps<TKey, string>) {
  return (
    <TextField
      fullWidth
      hiddenLabel
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error}
      variant="outlined"
      sx={(theme) => ({
        bgcolor: disabled ? theme.palette.action.disabledBackground : undefined,
      })}
    />
  );
}
