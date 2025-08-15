import {
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

type Props = {
  progress?: number | undefined;
  title?: string;
  message?: string;
};

export function LoadingPage({
  progress,
  title = "Loading...",
  message,
}: Props) {
  return (
    <Stack
      gap={2}
      alignItems="center"
      justifyContent="center"
      style={{ height: "60vh" }}
    >
      {progress === undefined ? (
        <CircularProgress size={72} />
      ) : (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ width: 240, height: 12, borderRadius: 6 }}
        />
      )}
      {title && (
        <Typography variant="h2" color="text.primary">
          {title}
        </Typography>
      )}
      {message && (
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      )}
    </Stack>
  );
}
