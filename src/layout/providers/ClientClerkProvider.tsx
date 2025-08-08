"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { PropsWithChildren } from "react";

export function ClientClerkProvider({ children }: PropsWithChildren) {
  return <ClerkProvider appearance={{ theme: dark }}>{children}</ClerkProvider>;
}
