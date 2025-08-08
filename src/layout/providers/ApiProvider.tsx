"use client";

import { RegistryProvider } from "@/utils/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PropsWithChildren } from "react";

const queryClient = new QueryClient();

export function ApiProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <RegistryProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </RegistryProvider>
    </QueryClientProvider>
  );
}
