import { AuthorEditPage } from "./pageClient";
import { EnsureAuthorCanEditWrapper } from "./EnsureAuthorCanEditWrapper";

export default function Page() {
  return (
    <EnsureAuthorCanEditWrapper>
      <AuthorEditPage />
    </EnsureAuthorCanEditWrapper>
  );
}


