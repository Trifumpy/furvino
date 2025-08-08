import { UserProvider } from "@/users/providers";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PropsWithChildren } from "react";
import { ApiProvider, ClientClerkProvider } from "./providers";

export function CoreProvider({ children }: PropsWithChildren) {
  return (
    <ClientClerkProvider>
      <ApiProvider>
        <UserProvider>{children}</UserProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ApiProvider>
    </ClientClerkProvider>
  );
}
