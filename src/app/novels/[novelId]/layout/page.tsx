import { EnsureCanEditWrapper } from "../edit/EnsureCanEditWrapper";
import { NovelLayoutPage } from "@/novels/pages";

export default function Page() {
  return (
    <EnsureCanEditWrapper>
      <NovelLayoutPage />
    </EnsureCanEditWrapper>
  );
}

