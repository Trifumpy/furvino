import { Stack, Typography } from "@mui/material";

type Props = {
  message?: string;
  statusCode?: number;
};

export function ErrorPage({ message }: Props) {
  return (
    <Stack
      gap={2}
      alignItems="center"
      justifyContent="center"
      style={{ height: "60vh" }}
    >
      <Typography variant="h2" color="text.primary">
        An Error Occurred
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {message || "Something went wrong. Please try again later."}
      </Typography>
    </Stack>
  );
}
