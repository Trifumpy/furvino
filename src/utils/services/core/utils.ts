export function sanitizeQueryParams<
  T extends Record<string, boolean | string | string[] | number | undefined>,
>(params: T): T {
  const sanitized: Partial<T> = { ...params };

  for (const key in params) {
    const value = params[key] as string | string[] | boolean | number | undefined;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        delete sanitized[key];
        continue;
      }
      continue;
    }
    
    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue === "") {
        delete sanitized[key];
        continue;
      }
      (sanitized as Record<string, string>)[key] = trimmedValue;
      continue;
    }
  }

  return sanitized as T;
}
