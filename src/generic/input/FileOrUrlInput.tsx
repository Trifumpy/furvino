import { Box, mergeSlotProps, Stack, Typography, useTheme } from "@mui/material";
import { Accept, useDropzone } from "react-dropzone";
import { CloudUploadIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "react-toastify";
import { ValueFieldProps } from "./KeyMapField";

type Props<TKey extends string> = ValueFieldProps<TKey, string> & {
  label?: string;
  onUpload?: (file: File) => Promise<void> | void;
  loading?: boolean;
  accept?: Accept;
  maxSize?: number;
};

const DEFAULT_MAX_FILE_SIZE = 128 * 1024 * 1024; // 128 MB

export function FileOrUrlInput<TKey extends string>({
  label = "File or URL",
  value,
  onChange,
  error,
  disabled = false,
  onUpload,
  loading = false,
  accept,
  maxSize = DEFAULT_MAX_FILE_SIZE,
}: Props<TKey>) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      if (onUpload) {
        try {
          await onUpload(file);
        } catch (e) {
          toast.error((e as Error)?.message || "Upload failed");
        }
      } else {
        toast.warning("Upload is not enabled for this field.");
      }
    },
    onDropRejected(fileRejections) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((err) => toast.error(`File ${file.name} rejected: ${err.message}`));
      });
    },
    disabled: loading || disabled,
    accept,
    maxSize,
    multiple: false,
  });

  const rootProps = getRootProps();
  const theme = useTheme();
  const borderColor = isDragActive
    ? theme.palette.primary.main
    : error
      ? theme.palette.error.light
      : theme.palette.divider;

  const isHttpUrl = typeof value === "string" && /^(https?:)?\/\//i.test(value);

  return (
    <Stack position="relative">
      {label && (
        <Typography
          variant="caption"
          color="textSecondary"
          position="absolute"
          left={8}
          px={1}
          top={2}
          sx={(theme) => ({
            translate: "0 -50%",
            bgcolor: theme.palette.background.default,
          })}
        >
          {label}
        </Typography>
      )}
      <Stack
        p={4}
        borderRadius={2}
        alignItems="center"
        gap={2}
        {...mergeSlotProps({}, {
          sx: {
            border: `2px dashed ${borderColor}`,
            cursor: loading || disabled ? "not-allowed" : "pointer",
          },
        })}
        {...rootProps}
      >
        <input {...getInputProps()} />
        {isHttpUrl ? (
          <Stack alignItems="center" gap={1}>
            <ExternalLinkIcon size={32} />
            <Typography variant="body2" color="primary.main" component="a" href={value} target="_blank" rel="noopener noreferrer">
              Open current file
            </Typography>
          </Stack>
        ) : (
          <CloudUploadIcon size={48} />
        )}
        <Stack alignItems="center">
          <Typography variant="body2" color="textPrimary">
            Drop a file here
          </Typography>
          <Typography variant="body2" color="textPrimary">
            or
          </Typography>
          <Typography variant="body2" color="primary.main">
            Choose a file
          </Typography>
        </Stack>
      </Stack>
      {error && (
        <Typography pl={2} variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
