export function filterEntries<TKey extends string, T>(
  obj: Record<TKey, T>,
  filterFn: (key: TKey, value: T) => boolean
): Record<TKey, T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => filterFn(k as TKey, v as T))
  ) as Record<TKey, T>;
}

export function pruneEmptyKeys<TKey extends string>(
  obj: Record<TKey, string | undefined | null>
): Record<TKey, string> {
  return filterEntries(obj, (_, val) => val ? val.trim().length > 0 : false) as Record<TKey, string>;
}
