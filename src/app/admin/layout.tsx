import { PropsWithChildren } from "react";
import { AdminGuardClient } from "./AdminGuardClient";

export default function AdminLayout({ children }: PropsWithChildren) {
  return <AdminGuardClient>{children}</AdminGuardClient>;
}


