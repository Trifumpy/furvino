import { CreateNovelPage } from "@/novels/pages";
import { AuthorGuardClient } from "@/users/providers";

export default function Page() {
  return (
    <AuthorGuardClient>
      <CreateNovelPage />
    </AuthorGuardClient>
  );
}


