import {
  Button,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Accept, useDropzone } from "react-dropzone";
import { CloudUploadIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "react-toastify";
import { ValueFieldProps } from "./KeyMapField";
import Link from "next/link";

type Props<TKey extends string> = ValueFieldProps<TKey, string> & {
  label?: string;
  onUpload?: (file: File) => Promise<void> | void;
  loading?: boolean;
  accept?: Accept;
  maxSize?: number;
  progressPercent?: number;
  etaSeconds?: number;
};

const DEFAULT_MAX_FILE_SIZE = Math.floor(1024 * 1024 * 1024); // 1 GB

export function FileOrUrlInput<TKey extends string>({
  label = "File or URL",
  value,
  error,
  disabled = false,
  onUpload,
  loading = false,
  accept,
  maxSize = DEFAULT_MAX_FILE_SIZE,
  progressPercent,
  etaSeconds,
}: Props<TKey>) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
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
        errors.forEach((err) =>
          toast.error(`File ${file.name} rejected: ${err.message}`)
        );
      });
    },
    disabled: loading || disabled,
    accept,
    maxSize,
    multiple: false,
    noClick: true,
  });

  const rootProps = getRootProps();
  const theme = useTheme();
  const borderColor = isDragActive
    ? theme.palette.primary.main
    : error
      ? theme.palette.error.light
      : theme.palette.divider;

  const isHttpUrl = typeof value === "string" && /^(https?:)?\/\//i.test(value);

  const isNullStringError =
    typeof error === "string" &&
    /Invalid input: expected string, received null/i.test(error);
  const helperMessage = isNullStringError
    ? "File is being uploaded to the cloud and link is being created. Please wait until uploading another file or saving changes."
    : error;

  const iconColor = disabled
    ? theme.palette.action.disabled
    : theme.palette.primary.main;

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
        sx={{
          border: `2px dashed ${borderColor}`,
          cursor: loading || disabled ? "not-allowed" : "pointer",
        }}
        {...rootProps}
      >
        <input {...getInputProps()} />
        {isHttpUrl ? (
          <Stack
            component={Link}
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            alignItems="center"
            gap={1}
          >
            <ExternalLinkIcon size={32} />
            <Typography variant="body2" color="primary.main">
              Open current file
            </Typography>
          </Stack>
        ) : (
          <CloudUploadIcon size={48} color={iconColor} />
        )}
        <Stack alignItems="center">
          <Typography variant="body2" color="textPrimary">
            Drop a file here
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              open();
            }}
            disabled={loading || disabled}
            sx={{ mt: 1 }}
          >
            Choose a file
          </Button>
        </Stack>
      </Stack>
      {typeof progressPercent === "number" && progressPercent >= 0 && (
        <Stack gap={0.5} sx={{ mt: 1, px: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(progressPercent, 100)}
          />
          <Typography variant="caption" color="textSecondary">
            {progressPercent}%
            {typeof etaSeconds === "number" && etaSeconds > 0
              ? ` • ~${etaSeconds}s remaining`
              : ""}
          </Typography>
        </Stack>
      )}
      {helperMessage && (
        <Typography
          pl={2}
          variant="caption"
          color={isNullStringError ? "textSecondary" : "error"}
        >
          {helperMessage}
        </Typography>
      )}
    </Stack>
  );
}
