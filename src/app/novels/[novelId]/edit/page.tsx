import { EditNovelPage } from "@/novels/pages";
import { EnsureCanEditWrapper } from "./EnsureCanEditWrapper";

export default function Page() {
  return (
    <EnsureCanEditWrapper>
      <EditNovelPage />
    </EnsureCanEditWrapper>
  );
}
