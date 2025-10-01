import { ResponsiveValue } from "@/app/types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogActionsProps,
  DialogContent,
  DialogContentProps,
  DialogProps,
  DialogTitle,
  DialogTitleProps,
  mergeSlotProps,
  Stack,
} from "@mui/material";

export type ModalProps = Omit<DialogProps, "open" | "onClose"> & {
  isOpen: boolean;
  close: () => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  p?: ResponsiveValue<number | string>;
  px?: ResponsiveValue<number | string>;
  py?: ResponsiveValue<number | string>;
  borderRadius?: ResponsiveValue<number | string>;
};

export function Modal({
  isOpen,
  close,
  onSubmit,
  children,
  p = 1,
  px,
  py,
  borderRadius = p,
  ...props
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={close}
      {...props}
      slotProps={mergeSlotProps(props.slotProps, {
        paper: {
          sx: {
            px: px ?? p,
            py: py ?? p,
            borderRadius,
            ...props.sx,
          },
        },
      })}
    >
      <form
        onSubmit={(e) => {
          if (onSubmit) {
            e.preventDefault();
            onSubmit?.(e);
            e.stopPropagation();
          }
        }}
        noValidate
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        {children}
      </form>
    </Dialog>
  );
}

export type ModalTitleProps = DialogTitleProps;
export function ModalTitle(props: ModalTitleProps) {
  return <DialogTitle {...props} />;
}

export type ModalActionsProps = DialogActionsProps & {
  submitAction?: string;
  cancelAction?: string;
  loading?: boolean;
  disabled?: boolean;
  close: () => void;
  cancelColor?: import("@mui/material").ButtonProps["color"];
  submitColor?: import("@mui/material").ButtonProps["color"];
  placeCancelAfterSubmit?: boolean;
};
export function ModalActions({
  close,
  submitAction,
  cancelAction = "Cancel",
  loading = false,
  disabled = false,
  cancelColor,
  submitColor,
  placeCancelAfterSubmit = false,
  children,
  ...props
}: ModalActionsProps) {
  return (
    <DialogActions {...props}>
      <Stack direction="row" justifyContent="flex-end" gap={1}>
        {children}
        {submitAction && !placeCancelAfterSubmit && (
          <Button
            disabled={loading || disabled}
            loading={loading}
            type="submit"
            color={submitColor}
          >
            {submitAction}
          </Button>
        )}
        <Button onClick={close} color={cancelColor ?? "secondary"}>
          {cancelAction}
        </Button>
        {submitAction && placeCancelAfterSubmit && (
          <Button
            disabled={loading || disabled}
            loading={loading}
            type="submit"
            color={submitColor}
          >
            {submitAction}
          </Button>
        )}
      </Stack>
    </DialogActions>
  );
}

export function ModalContent({ children, ...props }: DialogContentProps) {
  return (
    <DialogContent
      {...props}
      sx={{ overflow: "visible", pt: 1, ...(props as { sx?: object }).sx }}
    >
      {children}
    </DialogContent>
  );
}
