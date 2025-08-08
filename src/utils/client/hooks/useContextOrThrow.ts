import React from "react";

export class NoContextError extends Error {
  constructor(providerName: string) {
    super(`Missing ${providerName}Provider. Context value is null.`);
    this.name = "NoContextError";
  }
}

export function useContextOrThrow<T>(context: React.Context<T | null>, providerName: string): T {
  const value = React.useContext(context);
  if (value === null) {
    throw new NoContextError(providerName);
  }
  return value;
}
