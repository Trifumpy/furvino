import { ListedNovel } from "@/contracts/novels";
import { ModalControlProps } from "@/generic/hooks";
import { Modal, ModalActions, ModalContent, ModalTitle } from "@/generic/input";
import { useDeleteNovel } from "@/novels/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

type Props = ModalControlProps & {
  novel: ListedNovel;
};

export function DeleteNovelModal({ novel, close, isOpen }: Props) {
  const router = useRouter();
  const { deleteNovel } = useDeleteNovel(novel.id);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNovel();
      router.push(`/`);
    } catch (error) {
      console.error("Error deleting novel:", error);
    } finally {
      setIsDeleting(false);
    }
    close();
  };

  const confirmationSchema = useMemo(() => {
    return z.object({
      confirmationText: z
        .string()
        .min(1, "Confirmation text is required")
        .refine((val) => val === "DELETE FOREVER", {
          message: "You must type 'DELETE FOREVER' to confirm deletion",
        }),
    });
  }, []);
  type ConfirmationSchema = z.infer<typeof confirmationSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmationSchema>({
    defaultValues: { confirmationText: "" },
    resolver: zodResolver(confirmationSchema),
  });

  return (
    <Modal isOpen={isOpen} close={close} onSubmit={handleSubmit(handleDelete)}>
      <ModalTitle>Delete {`"${novel.title}"`}</ModalTitle>
      <ModalContent>
        <Stack gap={2}>
          <Typography variant="body1" gutterBottom>
            This action cannot be undone. If you are sure you want to delete
            this novel, type <b>DELETE FOREVER</b> below to confirm.
          </Typography>
          <TextField
            {...register("confirmationText")}
            label="Type 'DELETE FOREVER' to confirm"
            fullWidth
            error={!!errors.confirmationText}
            helperText={errors.confirmationText?.message}
          />
        </Stack>
      </ModalContent>
      <ModalActions
        close={close}
        submitAction="Confirm Deletion"
        submitColor="error"
        loading={isDeleting}
      />
    </Modal>
  );
}
