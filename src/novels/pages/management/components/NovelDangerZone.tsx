import { useModal } from "@/generic/hooks";
import { useNovel } from "@/novels/providers";
import { Button, Stack, Typography } from "@mui/material";
import { DeleteNovelModal } from "./DeleteNovelModal";

export function NovelDangerZone() {
  const { novel } = useNovel();

  const deleteModal = useModal();

  if (!novel) {
    return null;
  }

  return (
    <Stack
      p={2}
      borderRadius={2}
      sx={(theme) => ({ border: `1px solid ${theme.palette.error.main}` })}
    >
      <Typography variant="h4" color="error">
        Danger Zone
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        mt={2}
      >
        <Typography variant="body1" color="textSecondary">
          Permanently delete this novel. This action cannot be undone.
        </Typography>
        <Button
          onClick={() => deleteModal.open()}
          variant="outlined"
          color="error"
        >
          Delete Novel
        </Button>
      </Stack>
      <DeleteNovelModal {...deleteModal} novel={novel} />
    </Stack>
  );
}
