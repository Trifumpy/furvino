import { ResponsiveValue } from "@/app/types";
import { PublicUser } from "@/contracts/users";
import { Box, Stack, Typography } from "@mui/material";

export type AvatarProps = {
  fallbackName?: string;
  user?: PublicUser | null;
  size?: ResponsiveValue<number | string>;
};

export function Avatar({ fallbackName, user, size }: AvatarProps) {
  if (!user || !user.avatarUrl) {
    return <NameAvatar name={fallbackName} size={size} />;
  }

  return (
    <Box
      flexShrink={0}
      width={size}
      height={size}
      borderRadius="50%"
      component="img"
      sx={{
        objectFit: "cover",
      }}
      // Add a cache-busting param if the URL is from our API, so we can cache long-term safely
      src={user.avatarUrl}
      alt={`Avatar for ${user.username}`}
    />
  );
}

export type NameAvatarProps = Omit<AvatarProps, "user" | "fallbackName"> & {
  name?: string;
};

export function NameAvatar({ name, size = 24 }: NameAvatarProps) {
  const initials = getInitials(name);

  return (
    <Stack
      flexShrink={0}
      width={size}
      height={size}
      sx={(theme) => ({
        bgcolor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
      })}
      borderRadius="50%"
      alignItems="center"
      justifyContent="center"
      p={0}
    >
      <Typography
        variant="button"
        fontSize={size}
        fontWeight={"bold"}
        noWrap
        sx={{ scale: 0.7 }}
      >
        {initials}
      </Typography>
    </Stack>
  );
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2);
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
