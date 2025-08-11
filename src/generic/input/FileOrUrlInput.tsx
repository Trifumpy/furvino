import { TextField } from "@mui/material";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function FileOrUrlInput({
  label = "File or URL",
  value,
  onChange,
  error,
  disabled = false,
}: Props) {
  return (
    <TextField
      fullWidth
      disabled={disabled}
      label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error}
    />
  );
}
