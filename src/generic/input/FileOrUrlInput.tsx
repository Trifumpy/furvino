import { TextField } from "@mui/material";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function FileOrUrlInput({
  label = "File or URL",
  value,
  onChange,
  error,
}: Props) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error}
    />
  );
}
