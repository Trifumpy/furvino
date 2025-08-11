import { CreateAuthorResponse, createAuthorSchema } from "@/contracts/users";
import { ModalControlProps } from "@/generic/hooks";
import { Modal, ModalActions, ModalTitle } from "@/generic/input";
import { useCreateAuthor } from "@/novels/hooks/useCreateAuthor";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

const schema = createAuthorSchema;
type Schema = z.infer<typeof schema>;

type Author = CreateAuthorResponse;

type Props = ModalControlProps & {
  initialValues?: Partial<Schema>;
  onCreate: (values: Author) => void | Promise<void>;
};

export function AuthorCreationModal({
  initialValues,
  onCreate,
  close,
  isOpen,
}: Props) {
  const { createAuthor } = useCreateAuthor();

  const [handlingSubmit, setHandlingSubmit] = useState(false);

  const submit = async (values: Schema) => {
    try {
      const author = await createAuthor(values);
      await onCreate(author);
      close();
    } finally {
      setHandlingSubmit(false);
    }
  };

  const { register, handleSubmit, reset } = useForm<Schema>({
    defaultValues: initialValues,
    resolver: zodResolver(schema),
  });

  // if initialValues change, reset the form
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      title="Create Author"
      onSubmit={handleSubmit(submit)}
    >
      <ModalTitle>Create Author</ModalTitle>
      <TextField {...register("name")} label="Name" fullWidth required />
      <ModalActions
        close={close}
        submitAction="Create"
        loading={handlingSubmit}
      />
    </Modal>
  );
}
