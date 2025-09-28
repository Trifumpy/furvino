import {
  Box,
  mergeSlotProps,
  Stack,
  StackProps,
  Typography,
  useTheme,
} from "@mui/material";
import { SafeImage } from "@/generic/display";
import { Accept, useDropzone } from "react-dropzone";
import { CloudUploadIcon } from "lucide-react";
import { toast } from "react-toastify";

export type ImageInputProps = StackProps & {
  label?: string;
  valueUrl: string | undefined;
  onUpload: (file: File) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  accept?: Accept;
  maxSize?: number;
};

const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_IMAGE_ACCEPT: Accept = {
  "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
};

export function ImageInput({
  label,
  valueUrl,
  onUpload,
  loading = false,
  disabled = false,
  accept = DEFAULT_IMAGE_ACCEPT,
  maxSize = DEFAULT_MAX_IMAGE_SIZE,
  error,
  ...props
}: ImageInputProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    onDropRejected(fileRejections) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          toast.error(`File ${file.name} rejected: ${error.message}`);
        });
      });
    },
    disabled: loading || disabled,
    accept,
    maxSize,
  });

  const rootProps = getRootProps();
  const theme = useTheme();
  const borderColor = isDragActive
    ? theme.palette.primary.main
    : error
      ? theme.palette.error.light
      : theme.palette.divider;

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
        {...mergeSlotProps(props, {
          sx: {
            border: `2px dashed ${borderColor}`,
            cursor: "pointer",
          },
        })}
        {...rootProps}
      >
        <input {...getInputProps()} />
        {valueUrl ? (
          <Box width={300} height={100} sx={{ overflow: "hidden", borderRadius: 1 }}>
            <SafeImage
              src={valueUrl}
              alt={label || "Image preview"}
              width={300}
              height={100}
              sizes="300px"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        ) : (
          <CloudUploadIcon size={48} />
        )}
        <Stack alignItems="center">
          <Typography variant="body2" color="textPrimary">
            Drop an image here
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
